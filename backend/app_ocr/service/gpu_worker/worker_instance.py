from datetime import timedelta

import boto3
from django.conf import settings
from django.utils import timezone

from app_ocr.models import GpuWorkerLease


def _get_ec2_client():
    return boto3.client("ec2", region_name=settings.AWS_EC2_REGION_NAME)


def ensure_gpu_worker_running(queue_name):
    instance_id = next(
        gpu_worker["instance_id"]
        for gpu_worker in settings.GPU_WORKERS
        if queue_name in gpu_worker["queues"]
    )

    keep_alive_until = timezone.now() + timedelta(
        minutes=settings.GPU_WORKER_AUTOSTOP_IDLE_MINUTES,
    )
    GpuWorkerLease.objects.update_or_create(
        instance_id=instance_id,
        defaults={"keep_alive_until": keep_alive_until},
    )

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
