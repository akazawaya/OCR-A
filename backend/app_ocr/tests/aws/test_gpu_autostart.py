from unittest.mock import Mock, patch

import pytest
from django.core.cache import cache

from app_ocr.service.gpu_worker.heartbeat import (
    LAST_ENSURE_AT_CACHE_KEY,
)
from app_ocr.service.gpu_worker.worker_instance import ensure_gpu_worker_running

# TODO(#23): worker_sharedを本実装へ追加するコミットで、
# documentとwordが同じGPU EC2を共有する起動判定ケースを追加する。
# この際instance_IDを共通用で新設する予定であるため、後で整合性を確認する。

# DOCUMENT_WORKERをGPU Workerの代表として検証する。
DOCUMENT_WORKER = "worker_document"
DOCUMENT_INSTANCE_ID = "i-document"
GPU_WORKER_INSTANCE_IDS = {
    DOCUMENT_WORKER: DOCUMENT_INSTANCE_ID,
}


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
    settings.AWS_EC2_REGION_NAME = "ap-northeast-1"
    settings.GPU_WORKER_INSTANCE_IDS = GPU_WORKER_INSTANCE_IDS
    heartbeat_keys = [
        LAST_ENSURE_AT_CACHE_KEY.format(worker_type=worker_type)
        for worker_type in GPU_WORKER_INSTANCE_IDS
    ]
    cache.delete_many(heartbeat_keys)

    yield

    cache.delete_many(heartbeat_keys)


@pytest.fixture
def ec2_client(instance_state):
    client = Mock(spec_set=["describe_instances", "start_instances"])
    client.describe_instances.return_value = make_describe_instances_response(
        instance_id=DOCUMENT_INSTANCE_ID,
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
):
    with patch(
        "app_ocr.service.gpu_worker.worker_instance._get_ec2_client",
        return_value=ec2_client,
    ):
        ensure_gpu_worker_running(DOCUMENT_WORKER)

    if should_start:
        ec2_client.start_instances.assert_called_once_with(
            InstanceIds=[DOCUMENT_INSTANCE_ID]
        )
    else:
        ec2_client.start_instances.assert_not_called()
