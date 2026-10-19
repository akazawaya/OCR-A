import json
import unittest
from unittest.mock import ANY, Mock, patch

from infra.redis_failover_lambda import lambda_handler


class RedisFailoverTests(unittest.TestCase):
    def setUp(self):
        self.env = {
            "REDIS_ROLE_STATE_PARAMETER_NAME": "/ocr-a/redis/roles",
            "FENCED_SECURITY_GROUP_ID": "sg-fenced",
            "REDIS_HOST": "redis.internal.example.com",
            "ROUTE53_HOSTED_ZONE_ID": "ZTEST",
        }
        self.ec2, self.ssm, self.route53 = ec2, ssm, route53 = Mock(), Mock(), Mock()
        clients = {"ec2": ec2, "ssm": ssm, "route53": route53}
        ssm.get_parameter.return_value = {
            "Parameter": {"Value": json.dumps({"i-a": "active", "i-b": "standby"})}
        }
        ec2.describe_instances.side_effect = [
            {
                "Reservations": [
                    {
                        "Instances": [
                            {
                                "State": {"Name": "running"},
                                "Placement": {"AvailabilityZone": "ap-northeast-1a"},
                            }
                        ]
                    }
                ]
            },
            {
                "Reservations": [
                    {
                        "Instances": [
                            {
                                "State": {"Name": "running"},
                                "PrivateIpAddress": "10.0.2.20",
                            }
                        ]
                    }
                ]
            },
        ]
        route53.change_resource_record_sets.return_value = {
            "ChangeInfo": {"Id": "change-1"}
        }
        stopped_waiter = ec2.get_waiter.return_value
        dns_waiter = route53.get_waiter.return_value

        self.run_action = self.enterContext(
            patch("infra.redis_failover_lambda.run_redis_instance_action")
        )
        self.operations = Mock()
        for name, method in (
            ("fence", ec2.modify_instance_attribute),
            ("stop", ec2.stop_instances),
            ("wait_stopped", stopped_waiter.wait),
            ("change_dns", route53.change_resource_record_sets),
            ("wait_dns", dns_waiter.wait),
            ("update_roles", ssm.put_parameter),
        ):
            self.operations.attach_mock(method, name)

        self.enterContext(patch.dict("os.environ", self.env, clear=True))
        self.enterContext(
            patch(
                "infra.redis_failover_lambda.boto3.client",
                side_effect=clients.__getitem__,
            )
        )

    def alarm_event(self, az):
        metric = {"dimensions": {"AvailabilityZone": az}}
        return {
            "alarmData": {
                "configuration": {"metrics": [{"metricStat": {"metric": metric}}]}
            }
        }

    def test_redis_failover_skips_standby_alarm(self):
        # activeは1a Failover発報元はstandbyの1c
        lambda_handler(self.alarm_event("ap-northeast-1c"), None)

        self.assertEqual(self.operations.mock_calls, [])
        self.run_action.assert_not_called()

    def test_redis_failover_promotes_standby_after_fencing_active(self):
        lambda_handler(self.alarm_event("ap-northeast-1a"), None)

        # AのSGを通信隔離用SGへ変更する要求が呼ばれたことを確認
        self.ec2.modify_instance_attribute.assert_called_once_with(
            InstanceId="i-a", Groups=["sg-fenced"]
        )

        # Aの停止要求と停止完了待ちが呼ばれたことを確認
        self.ec2.stop_instances.assert_called_once_with(InstanceIds=["i-a"])
        self.ec2.get_waiter.assert_called_once_with("instance_stopped")
        self.ec2.get_waiter.return_value.wait.assert_called_once_with(
            InstanceIds=["i-a"]
        )

        # 固定DNS名をBのPrivate IPへ変更する要求と反映完了待ちが呼ばれたことを確認
        self.route53.change_resource_record_sets.assert_called_with(
            HostedZoneId="ZTEST",
            ChangeBatch={
                "Changes": [
                    {
                        "Action": "UPSERT",
                        "ResourceRecordSet": {
                            "Name": self.env["REDIS_HOST"],
                            "Type": "A",
                            "TTL": ANY,
                            "ResourceRecords": [{"Value": "10.0.2.20"}],
                        },
                    }
                ],
            },
        )
        self.route53.get_waiter.assert_called_once_with("resource_record_sets_changed")
        self.route53.get_waiter.return_value.wait.assert_called_once_with(Id="change-1")

        # 役割状態をA=fenced、B=activeへ更新する要求が呼ばれたことを確認
        self.ssm.put_parameter.assert_called_with(
            Name=self.env["REDIS_ROLE_STATE_PARAMETER_NAME"],
            Value=ANY,
            Type="String",
            Overwrite=True,
        )
        self.assertEqual(
            json.loads(self.ssm.put_parameter.call_args.kwargs["Value"]),
            {"i-a": "fenced", "i-b": "active"},
        )

        # 呼び出し順を確認 停止完了待ち→DNS更新→DNS反映完了待ち→役割更新
        self.assertEqual(
            [operation[0] for operation in self.operations.mock_calls],
            [
                "fence",
                "stop",
                "wait_stopped",
                "change_dns",
                "wait_dns",
                "update_roles",
            ],
        )
