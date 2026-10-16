import json
import os

import boto3

from infra.redis_lambda_common import run_redis_instance_action


def lambda_handler(_event, _context):
    ec2 = boto3.client("ec2")
    ssm = boto3.client("ssm")
    route53 = boto3.client("route53")
    role_parameter_name = os.environ["REDIS_ROLE_STATE_PARAMETER_NAME"]

    role_parameter_value = ssm.get_parameter(Name=role_parameter_name)["Parameter"][
        "Value"
    ]
    roles = json.loads(role_parameter_value)
    if sorted(roles.values()) == ["active", "fenced"]:
        return {"result": "already completed"}
    if sorted(roles.values()) != ["active", "standby"]:
        raise RuntimeError("Failover requires active and standby")

    old_active = next(key for key, value in roles.items() if value == "active")
    new_active = next(key for key, value in roles.items() if value == "standby")
    print(f"フェイルオーバーを開始: old_active={old_active}, new_active={new_active}")

    # 1. active → fenced
    # フェンス1: 通信隔離用SGを適用
    # フェンス2: 旧activeのec2を停止し、旧activeが停止完了(stopped)になるまで待機
    ec2.modify_instance_attribute(
        InstanceId=old_active,
        Groups=[os.environ["FENCED_SECURITY_GROUP_ID"]],
    )
    print(f"通信隔離用SGを適用: instance={old_active}")

    old_instance = ec2.describe_instances(InstanceIds=[old_active])
    if old_instance["Reservations"][0]["Instances"][0]["State"]["Name"] != "stopped":
        ec2.stop_instances(InstanceIds=[old_active])
        ec2.get_waiter("instance_stopped").wait(
            InstanceIds=[old_active],
        )
    print(f"旧activeの停止を確認: instance={old_active}")

    # 2. standby → active
    # クライアント接続先をstandbyからactiveへ切替、完了まで待機
    new_instance = ec2.describe_instances(InstanceIds=[new_active])["Reservations"][0][
        "Instances"
    ][0]
    if new_instance["State"]["Name"] != "running":
        raise RuntimeError("Standby EC2 is not running")
    run_redis_instance_action(ssm, new_active, "active")
    print(f"standbyのactive化が完了: instance={new_active}")
    # 3. Redis役割状態情報を更新
    change = route53.change_resource_record_sets(
        HostedZoneId=os.environ["ROUTE53_HOSTED_ZONE_ID"],
        ChangeBatch={
            "Changes": [
                {
                    "Action": "UPSERT",
                    "ResourceRecordSet": {
                        "Name": os.environ["REDIS_DNS_NAME"],
                        "Type": "A",
                        "TTL": 30,
                        "ResourceRecords": [
                            {"Value": new_instance["PrivateIpAddress"]}
                        ],
                    },
                }
            ]
        },
    )
    route53.get_waiter("resource_record_sets_changed").wait(
        Id=change["ChangeInfo"]["Id"],
    )
    print(f"Redis接続先の切り替えが完了: instance={new_active}")
    roles[old_active] = "fenced"
    roles[new_active] = "active"
    role_parameter_value = json.dumps(roles, sort_keys=True)
    ssm.put_parameter(
        Name=role_parameter_name,
        Value=role_parameter_value,
        Type="String",
        Overwrite=True,
    )
    print(f"Redis役割状態を更新: active={new_active}, fenced={old_active}")
    return {"result": "failed over", "active": new_active}
