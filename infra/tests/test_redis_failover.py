import json
import unittest
from unittest.mock import ANY, Mock, patch

from infra.redis_failover_lambda import lambda_handler


class RedisFailoverTests(unittest.TestCase):
    def test_redis_failover_promotes_standby_after_fencing_active(self):
        env = {
            "REDIS_ROLE_STATE_PARAMETER_NAME": "/ocr-a/redis/roles",
            "FENCED_SECURITY_GROUP_ID": "sg-fenced",
            "REDIS_HOST": "redis.internal.example.com",
            "ROUTE53_HOSTED_ZONE_ID": "ZTEST",
        }
        ec2, ssm, route53 = Mock(), Mock(), Mock()
        clients = {"ec2": ec2, "ssm": ssm, "route53": route53}
        ssm.get_parameter.return_value = {
            "Parameter": {"Value": json.dumps({"i-a": "active", "i-b": "standby"})}
        }
        ec2.describe_instances.side_effect = [
            {"Reservations": [{"Instances": [{"State": {"Name": "running"}}]}]},
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

        operations = Mock()
        for name, method in (
            ("fence", ec2.modify_instance_attribute),
            ("stop", ec2.stop_instances),
            ("wait_stopped", stopped_waiter.wait),
            ("change_dns", route53.change_resource_record_sets),
            ("wait_dns", dns_waiter.wait),
            ("update_roles", ssm.put_parameter),
        ):
            operations.attach_mock(method, name)

        with (
            patch.dict("os.environ", env, clear=True),
            patch(
                "infra.redis_failover_lambda.boto3.client",
                side_effect=clients.__getitem__,
            ),
            patch("infra.redis_failover_lambda.run_redis_instance_action"),
        ):
            lambda_handler({}, None)

        # AのSGを通信隔離用SGへ変更する要求が呼ばれたことを確認
        ec2.modify_instance_attribute.assert_called_once_with(
            InstanceId="i-a", Groups=["sg-fenced"]
        )

        # Aの停止要求と停止完了待ちが呼ばれたことを確認
        ec2.stop_instances.assert_called_once_with(InstanceIds=["i-a"])
        ec2.get_waiter.assert_called_once_with("instance_stopped")
        stopped_waiter.wait.assert_called_once_with(InstanceIds=["i-a"])

        # 固定DNS名をBのPrivate IPへ変更する要求と反映完了待ちが呼ばれたことを確認
        route53.change_resource_record_sets.assert_called_with(
            HostedZoneId="ZTEST",
            ChangeBatch={
                "Changes": [
                    {
                        "Action": "UPSERT",
                        "ResourceRecordSet": {
                            "Name": env["REDIS_HOST"],
                            "Type": "A",
                            "TTL": ANY,
                            "ResourceRecords": [{"Value": "10.0.2.20"}],
                        },
                    }
                ],
            },
        )
        route53.get_waiter.assert_called_once_with("resource_record_sets_changed")
        dns_waiter.wait.assert_called_once_with(Id="change-1")

        # 役割状態をA=fenced、B=activeへ更新する要求が呼ばれたことを確認
        ssm.put_parameter.assert_called_with(
            Name=env["REDIS_ROLE_STATE_PARAMETER_NAME"],
            Value=ANY,
            Type="String",
            Overwrite=True,
        )
        self.assertEqual(
            json.loads(ssm.put_parameter.call_args.kwargs["Value"]),
            {"i-a": "fenced", "i-b": "active"},
        )

        # 呼び出し順を確認 停止完了待ち→DNS更新→DNS反映完了待ち→役割更新
        self.assertEqual(
            [operation[0] for operation in operations.mock_calls],
            ["fence", "stop", "wait_stopped", "change_dns", "wait_dns", "update_roles"],
        )
