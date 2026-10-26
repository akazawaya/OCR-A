import json
import unittest
from unittest.mock import ANY, Mock, call, patch

from infra.redis_recovery_lambda import lambda_handler


class RedisRecoveryTests(unittest.TestCase):
    def test_redis_recovery_restores_fenced_instance_to_standby_after_checks(self):
        env = {
            "REDIS_ROLE_STATE_PARAMETER_NAME": "/ocr-a/redis/roles",
            "RESTORE_SECURITY_GROUPS_PARAMETER_NAME": "/ocr-a/redis/restore-groups",
            "FENCED_SECURITY_GROUP_ID": "sg-fenced",
            "CPU_PARAMETER_STORE_PATH": "/ocr-a/cpu/",
            "AWS_REGION": "ap-northeast-1",
            "DEPLOYMENT_PROFILE": "production-cpu",
            "VITE_API_BASE_URL": "https://api.example.com/api/",
        }
        ec2, ssm = Mock(), Mock()
        clients = {"ec2": ec2, "ssm": ssm}
        parameters = {
            env["REDIS_ROLE_STATE_PARAMETER_NAME"]: {"i-a": "fenced", "i-b": "active"},
            env["RESTORE_SECURITY_GROUPS_PARAMETER_NAME"]: {"i-a": ["sg-normal"]},
        }
        ssm.get_parameter.side_effect = lambda Name: {
            "Parameter": {"Value": json.dumps(parameters[Name])}
        }
        ec2.describe_instances.return_value = {
            "Reservations": [{"Instances": [{"State": {"Name": "stopped"}}]}]
        }
        ssm.describe_instance_information.return_value = {
            "InstanceInformationList": [{"PingStatus": "Online"}]
        }
        ssm.send_command.return_value = {"Command": {"CommandId": "recovery-1"}}
        running_waiter = ec2.get_waiter.return_value
        recovery_waiter = ssm.get_waiter.return_value

        operations = Mock()
        for name, method in (
            ("change_sg", ec2.modify_instance_attribute),
            ("start", ec2.start_instances),
            ("wait_running", running_waiter.wait),
            ("recover", ssm.send_command),
            ("wait_recovery", recovery_waiter.wait),
            ("update_roles", ssm.put_parameter),
        ):
            operations.attach_mock(method, name)

        with (
            patch.dict("os.environ", env, clear=True),
            patch(
                "infra.redis_recovery_lambda.boto3.client",
                side_effect=clients.__getitem__,
            ),
        ):
            lambda_handler({}, None)

        # Aの隔離SG適用とEC2起動・起動完了待ちが呼ばれたことを確認
        ec2.modify_instance_attribute.assert_has_calls(
            [
                call(InstanceId="i-a", Groups=["sg-fenced"]),
                call(InstanceId="i-a", Groups=["sg-normal"]),
            ]
        )
        ec2.start_instances.assert_called_once_with(InstanceIds=["i-a"])
        ec2.get_waiter.assert_called_once_with("instance_running")
        running_waiter.wait.assert_called_once_with(InstanceIds=["i-a"])

        # データ破棄・正常性確認を行う復旧スクリプトの実行と成功待ちを確認
        ssm.send_command.assert_called_with(
            InstanceIds=["i-a"],
            DocumentName="AWS-RunShellScript",
            Parameters={
                "commands": [
                    "cd /opt/ocr-a && bash .github/scripts/manage-redis-instance.sh "
                    "standby /ocr-a/cpu/ ap-northeast-1 production-cpu "
                    "https://api.example.com/api/"
                ]
            },
        )
        ssm.get_waiter.assert_called_once_with("command_executed")
        recovery_waiter.wait.assert_called_once_with(
            CommandId="recovery-1", InstanceId="i-a"
        )

        # A=standby、B=activeの役割更新要求が呼ばれたことを確認
        ssm.put_parameter.assert_called_with(
            Name=env["REDIS_ROLE_STATE_PARAMETER_NAME"],
            Value=ANY,
            Type="String",
            Overwrite=True,
        )
        self.assertEqual(
            json.loads(ssm.put_parameter.call_args.kwargs["Value"]),
            {"i-a": "standby", "i-b": "active"},
        )

        # 呼び出し順を確認 隔離SG適用→EC2起動→起動完了待ち→復旧処理→成功待ち→SG復元→役割更新
        self.assertEqual(
            [operation[0] for operation in operations.mock_calls],
            [
                "change_sg",
                "start",
                "wait_running",
                "recover",
                "wait_recovery",
                "change_sg",
                "update_roles",
            ],
        )
