import boto3
from django.conf import settings

from app_ocr.service.gpu_worker.heartbeat import mark_gpu_worker_ensured


def _get_ec2_client():
    return boto3.client("ec2", region_name=settings.AWS_EC2_REGION_NAME)


def ensure_gpu_worker_running(queue_name):
    instance_id = next(
        gpu_worker["instance_id"]
        for gpu_worker in settings.GPU_WORKERS
        if queue_name in gpu_worker["queues"]
    )
    mark_gpu_worker_ensured(instance_id)

    ec2_client = _get_ec2_client()
    response = ec2_client.describe_instances(InstanceIds=[instance_id])
    state = response["Reservations"][0]["Instances"][0]["State"]["Name"]

    if state == "stopped":
        ec2_client.start_instances(InstanceIds=[instance_id])


def stop_gpu_worker(instance_id):
    ec2_client = _get_ec2_client()

    response = ec2_client.describe_instances(InstanceIds=[instance_id])
    state = response["Reservations"][0]["Instances"][0]["State"]["Name"]

    if state == "running":
        ec2_client.stop_instances(InstanceIds=[instance_id])
