import os
import time


def run_redis_instance_action(ssm, instance_id, action):
    print(f"SSMのオンライン化を待機: instance={instance_id}")
    while True:
        response = ssm.describe_instance_information(
            Filters=[{"Key": "InstanceIds", "Values": [instance_id]}]
        )
        if any(
            item["PingStatus"] == "Online"
            for item in response["InstanceInformationList"]
        ):
            break
        time.sleep(5)
    print(f"SSMのオンライン化を確認: instance={instance_id}")

    arguments = [
        "bash",
        ".github/scripts/manage-redis-instance.sh",
        action,
        os.environ["CPU_PARAMETER_STORE_PATH"],
        os.environ["AWS_REGION"],
        os.environ["DEPLOYMENT_PROFILE"],
        os.environ["VITE_API_BASE_URL"],
    ]
    command = "cd /opt/ocr-a && " + " ".join(arguments)
    command_id = ssm.send_command(
        InstanceIds=[instance_id],
        DocumentName="AWS-RunShellScript",
        Parameters={"commands": [command]},
    )["Command"]["CommandId"]
    print(f"SSMコマンドを開始: instance={instance_id}, action={action}")
    ssm.get_waiter("command_executed").wait(
        CommandId=command_id,
        InstanceId=instance_id,
    )
    print(f"SSMコマンドが完了: instance={instance_id}, action={action}")
