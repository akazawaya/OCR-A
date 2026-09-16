import boto3
from django.conf import settings

from app_ocr.service.gpu_worker.heartbeat import mark_gpu_worker_ensured


def _get_instance_id(worker_type):
    try:
        instance_id = settings.GPU_WORKER_INSTANCE_IDS[worker_type]
    except KeyError as exc:
        raise KeyError(f"Unknown worker_type: {worker_type}") from exc

    if not instance_id:
        raise ValueError(f"Missing instance id for worker_type: {worker_type}")

    return instance_id


def _get_ec2_client():
    return boto3.client("ec2", region_name=settings.AWS_EC2_REGION_NAME)


def ensure_gpu_worker_running(worker_type):
    mark_gpu_worker_ensured(worker_type)

    ec2_client = _get_ec2_client()
    instance_id = _get_instance_id(worker_type)

    response = ec2_client.describe_instances(InstanceIds=[instance_id])
    state = response["Reservations"][0]["Instances"][0]["State"]["Name"]

    if state == "stopped":
        ec2_client.start_instances(InstanceIds=[instance_id])


def stop_gpu_worker(worker_type):
    ec2_client = _get_ec2_client()
    instance_id = _get_instance_id(worker_type)

    response = ec2_client.describe_instances(InstanceIds=[instance_id])
    state = response["Reservations"][0]["Instances"][0]["State"]["Name"]

    if state == "running":
        ec2_client.stop_instances(InstanceIds=[instance_id])
