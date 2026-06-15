from importlib import import_module
from unittest.mock import Mock, patch

import pytest

GPU_WORKER_INSTANCE_IDS = {
    "worker_document": "i-document",
    "worker_preview_word": "i-preview-word",
}


def make_describe_instances_response(instance_id):
    return {
        "Reservations": [
            {
                "Instances": [
                    {
                        "InstanceId": instance_id,
                        "State": {"Name": "stopped"},
                    }
                ],
            }
        ],
    }


@pytest.fixture(autouse=True)
def configure_gpu_worker_settings(settings):
    settings.AWS_EC2_REGION_NAME = "ap-northeast-1"
    settings.GPU_WORKER_INSTANCE_IDS = GPU_WORKER_INSTANCE_IDS


@pytest.fixture
def ec2_client():
    return Mock()


def start_gpu_worker(worker_type, instance_id, ec2_client):
    ec2_client.describe_instances.return_value = make_describe_instances_response(
        instance_id,
    )

    with patch(
        "app_ocr.service.gpu_instance.boto3.client",
        return_value=ec2_client,
    ):
        service = import_module("app_ocr.service.gpu_instance")
        service.ensure_gpu_worker_running(worker_type)


def test_start_instances_for_worker_document(ec2_client):
    instance_id = GPU_WORKER_INSTANCE_IDS["worker_document"]
    start_gpu_worker("worker_document", instance_id, ec2_client)

    ec2_client.start_instances.assert_called_once_with(InstanceIds=[instance_id])


def test_start_instances_for_worker_preview_word(ec2_client):
    instance_id = GPU_WORKER_INSTANCE_IDS["worker_preview_word"]
    start_gpu_worker("worker_preview_word", instance_id, ec2_client)

    ec2_client.start_instances.assert_called_once_with(InstanceIds=[instance_id])
