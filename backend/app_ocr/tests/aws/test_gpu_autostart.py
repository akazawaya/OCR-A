from unittest.mock import Mock, call, patch

import pytest
from celery.contrib.testing.worker import start_worker
from celery.result import allow_join_result
from django.utils import timezone
from redis import Redis

from app_ocr.models import GpuWorkerLease
from app_ocr.service.gpu_worker.worker_instance import ensure_gpu_worker_running
from app_ocr.tasks import request_gpu_worker_start
from project.celery import app as celery_app

TEST_QUEUE = "test_gpu_queue"
MAINTENANCE_QUEUE = "maintenance_queue"
INSTANCE_ID = "i-gpu"
GPU_WORKERS = [
    {
        "queues": (TEST_QUEUE,),
        "instance_id": INSTANCE_ID,
    },
]

pytestmark = pytest.mark.django_db


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
    settings.ENABLE_GPU_WORKER_AUTOSTART = True
    settings.GPU_WORKERS = GPU_WORKERS
    settings.GPU_WORKER_AUTOSTOP_IDLE_MINUTES = 0.1
    settings.GPU_WORKER_AUTOSTART_RETRY_INTERVAL_SECONDS = 30


@pytest.fixture
def ec2_client(instance_state):
    client = Mock(spec_set=["describe_instances", "start_instances"])
    client.describe_instances.return_value = make_describe_instances_response(
        instance_id=INSTANCE_ID,
        state=instance_state,
    )
    with patch(
        "app_ocr.service.gpu_worker.worker_instance._get_ec2_client",
        return_value=client,
    ):
        yield client


@pytest.fixture
def redis_client(settings):
    client = Redis.from_url(settings.CELERY_BROKER_URL)
    client.delete(MAINTENANCE_QUEUE)

    yield client

    client.delete(MAINTENANCE_QUEUE)


@pytest.mark.parametrize(
    ("instance_state", "should_start"),
    [
        ("stopped", True),
        ("stopping", False),
        ("running", False),
        ("pending", False),
    ],
)
def test_gpu_worker_autostart(
    should_start,
    ec2_client,
    instance_state,
):
    state = ensure_gpu_worker_running(TEST_QUEUE)

    lease = GpuWorkerLease.objects.get(instance_id=INSTANCE_ID)
    assert lease.keep_alive_until > timezone.now()
    assert state == instance_state

    if should_start:
        ec2_client.start_instances.assert_called_once_with(InstanceIds=[INSTANCE_ID])
    else:
        ec2_client.start_instances.assert_not_called()


def test_gpu_worker_start_task_retries_while_stopping(settings, redis_client):
    settings.GPU_WORKER_AUTOSTART_RETRY_INTERVAL_SECONDS = 0.1

    with (
        patch(
            "app_ocr.tasks.ensure_gpu_worker_running",
            side_effect=["stopping", "stopped"],
        ) as ensure_running,
        start_worker(
            celery_app,
            concurrency=1,
            pool="threads",
            queues=[MAINTENANCE_QUEUE],
            perform_ping_check=False,
        ),
    ):
        task_result = request_gpu_worker_start.delay(TEST_QUEUE)
        try:
            with allow_join_result():
                task_result.get(timeout=5)
        finally:
            task_result.forget()

    assert ensure_running.call_args_list == [call(TEST_QUEUE), call(TEST_QUEUE)]
