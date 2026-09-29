from unittest.mock import Mock, patch

import pytest
from django.core.cache import cache

from app_ocr.service.gpu_worker.heartbeat import (
    LAST_ENSURE_AT_CACHE_KEY,
)
from app_ocr.service.gpu_worker.worker_instance import ensure_gpu_worker_running

TEST_QUEUE = "test_gpu_queue"
INSTANCE_ID = "i-gpu"
GPU_WORKERS = [
    {
        "queues": (TEST_QUEUE,),
        "instance_id": INSTANCE_ID,
    },
]


def make_describe_instances_response(instance_id, state):
    return {
        "Reservations": [
            {
                "Instances": [
                    {
                        "InstanceId": instance_id,
                        "State": {"Name": state},
                    }
                ],
            }
        ],
    }


@pytest.fixture(autouse=True)
def configure_gpu_worker_settings(settings):
    settings.GPU_WORKERS = GPU_WORKERS
    heartbeat_keys = [
        LAST_ENSURE_AT_CACHE_KEY.format(instance_id=INSTANCE_ID),
    ]
    cache.delete_many(heartbeat_keys)

    yield

    cache.delete_many(heartbeat_keys)


@pytest.fixture
def ec2_client(instance_state):
    client = Mock(spec_set=["describe_instances", "start_instances"])
    client.describe_instances.return_value = make_describe_instances_response(
        instance_id=INSTANCE_ID,
        state=instance_state,
    )
    return client


@pytest.mark.parametrize(
    ("instance_state", "should_start"),
    [
        ("stopped", True),
        ("running", False),
        ("pending", False),
    ],
)
def test_gpu_worker_autostart(
    should_start,
    ec2_client,
    instance_state,
):
    with patch(
        "app_ocr.service.gpu_worker.worker_instance._get_ec2_client",
        return_value=ec2_client,
    ):
        ensure_gpu_worker_running(TEST_QUEUE)

    if should_start:
        ec2_client.start_instances.assert_called_once_with(InstanceIds=[INSTANCE_ID])
    else:
        ec2_client.start_instances.assert_not_called()
