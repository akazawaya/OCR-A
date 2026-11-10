import json
import os

import boto3

from infra.redis_lambda_common import run_redis_instance_action


def lambda_handler(_event, _context):
    ec2 = boto3.client("ec2")
    ssm = boto3.client("ssm")
    role_parameter_name = os.environ["REDIS_ROLE_STATE_PARAMETER_NAME"]

    role_parameter_value = ssm.get_parameter(Name=role_parameter_name)["Parameter"][
        "Value"
    ]
    roles = json.loads(role_parameter_value)
    if sorted(roles.values()) == ["active", "standby"]:
        return {"result": "not required"}
    if sorted(roles.values()) != ["active", "fenced"]:
        raise RuntimeError("Recovery requires active and fenced")

    fenced = next(key for key, value in roles.items() if value == "fenced")
    restore_groups_parameter_name = os.environ[
        "RESTORE_SECURITY_GROUPS_PARAMETER_NAME"
    ]
    restore_groups_parameter_value = ssm.get_parameter(
        Name=restore_groups_parameter_name
    )["Parameter"]["Value"]
    restore_groups = json.loads(restore_groups_parameter_value)[fenced]
    print(f"standby復旧を開始: instance={fenced}")
    fenced_sg = [os.environ["FENCED_SECURITY_GROUP_ID"]]
    ec2.modify_instance_attribute(InstanceId=fenced, Groups=fenced_sg)
    print(f"通信隔離用SGを適用: instance={fenced}")
    response = ec2.describe_instances(InstanceIds=[fenced])
    state = response["Reservations"][0]["Instances"][0]["State"]["Name"]

    if state == "stopping":
        return {"result": "waiting for stopped"}
    if state in {"pending", "running"}:
        ec2.stop_instances(InstanceIds=[fenced])
        return {"result": "stopped unexpected running instance"}
    if state in {"terminated", "shutting-down"}:
        raise RuntimeError(f"Cannot recover {state} instance")
    if state != "stopped":
        raise RuntimeError(f"Unexpected EC2 state: {state}")

    ec2.start_instances(InstanceIds=[fenced])
    ec2.get_waiter("instance_running").wait(
        InstanceIds=[fenced],
    )
    print(f"fencedインスタンスの起動を確認: instance={fenced}")
    run_redis_instance_action(ssm, fenced, "standby")
    print(f"standby用サービスの動作確認が完了: instance={fenced}")

    current_role_parameter_value = ssm.get_parameter(Name=role_parameter_name)[
        "Parameter"
    ]["Value"]
    current_roles = json.loads(current_role_parameter_value)
    if current_roles != roles:
        ec2.stop_instances(InstanceIds=[fenced])
        raise RuntimeError("Redis roles changed during recovery")

    ec2.modify_instance_attribute(InstanceId=fenced, Groups=restore_groups)
    print(f"初期SGへ復旧: instance={fenced}")
    roles[fenced] = "standby"
    role_parameter_value = json.dumps(roles, sort_keys=True)
    try:
        ssm.put_parameter(
            Name=role_parameter_name,
            Value=role_parameter_value,
            Type="String",
            Overwrite=True,
        )
    except Exception:
        ec2.modify_instance_attribute(InstanceId=fenced, Groups=fenced_sg)
        ec2.stop_instances(InstanceIds=[fenced])
        raise

    print(f"Redis役割状態を更新: standby={fenced}")
    return {"result": "recovered", "standby": fenced}
