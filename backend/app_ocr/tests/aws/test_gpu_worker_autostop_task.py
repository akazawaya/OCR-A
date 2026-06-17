from datetime import timedelta
from unittest.mock import patch

import pytest
from django.utils import timezone

from app_ocr.tasks import check_gpu_worker_autostop_task

AUTOSTOP_THRESHOLD_SECONDS = 6


@pytest.fixture(autouse=True)
def configure_gpu_worker_autostop_settings(settings):
    settings.ENABLE_GPU_WORKER_AUTOSTOP = True
    settings.GPU_WORKER_AUTOSTOP_IDLE_MINUTES = AUTOSTOP_THRESHOLD_SECONDS / 60
    settings.GPU_WORKER_INSTANCE_IDS = {
        "worker_document": "i-document",
    }


def make_last_ensure_at(seconds_ago):
    return timezone.now() - timedelta(seconds=seconds_ago)


def test_autostop_does_not_stop_when_redis_queue_has_pending_tasks():
    with (
        patch(
            "app_ocr.tasks.get_last_ensure_at",
            return_value=make_last_ensure_at(
                seconds_ago=AUTOSTOP_THRESHOLD_SECONDS + 3,
            ),
        ),
        patch(
            "app_ocr.tasks.has_pending_gpu_worker_queue_tasks",
            return_value=True,
        ) as mock_has_pending_queue_tasks,
        patch(
            "app_ocr.tasks.has_active_or_reserved_gpu_worker_tasks",
            return_value=False,
        ) as mock_has_active_or_reserved_tasks,
        patch("app_ocr.tasks.stop_gpu_worker") as mock_stop_gpu_worker,
    ):
        check_gpu_worker_autostop_task()

    mock_has_pending_queue_tasks.assert_called_once_with("worker_document")
    mock_has_active_or_reserved_tasks.assert_not_called()
    mock_stop_gpu_worker.assert_not_called()


@pytest.mark.parametrize(
    "has_active_or_reserved_tasks",
    [True],
)
def test_autostop_does_not_stop_when_celery_has_active_or_reserved_tasks(
    has_active_or_reserved_tasks,
):
    with (
        patch(
            "app_ocr.tasks.get_last_ensure_at",
            return_value=make_last_ensure_at(
                seconds_ago=AUTOSTOP_THRESHOLD_SECONDS + 3,
            ),
        ),
        patch(
            "app_ocr.tasks.has_pending_gpu_worker_queue_tasks",
            return_value=False,
        ) as mock_has_pending_queue_tasks,
        patch(
            "app_ocr.tasks.has_active_or_reserved_gpu_worker_tasks",
            return_value=has_active_or_reserved_tasks,
        ) as mock_has_active_or_reserved_tasks,
        patch("app_ocr.tasks.stop_gpu_worker") as mock_stop_gpu_worker,
    ):
        check_gpu_worker_autostop_task()

    mock_has_pending_queue_tasks.assert_called_once_with("worker_document")
    mock_has_active_or_reserved_tasks.assert_called_once_with("worker_document")
    mock_stop_gpu_worker.assert_not_called()


def test_autostop_does_not_stop_when_idle_time_is_just_below_threshold():
    with (
        patch(
            "app_ocr.tasks.get_last_ensure_at",
            return_value=make_last_ensure_at(
                seconds_ago=AUTOSTOP_THRESHOLD_SECONDS - 3,
            ),
        ) as mock_get_last_ensure_at,
        patch(
            "app_ocr.tasks.has_pending_gpu_worker_queue_tasks",
            return_value=False,
        ) as mock_has_pending_queue_tasks,
        patch(
            "app_ocr.tasks.has_active_or_reserved_gpu_worker_tasks",
            return_value=False,
        ) as mock_has_active_or_reserved_tasks,
        patch("app_ocr.tasks.stop_gpu_worker") as mock_stop_gpu_worker,
    ):
        check_gpu_worker_autostop_task()

    mock_get_last_ensure_at.assert_called_once_with("worker_document")
    mock_has_pending_queue_tasks.assert_not_called()
    mock_has_active_or_reserved_tasks.assert_not_called()
    mock_stop_gpu_worker.assert_not_called()


def test_autostop_stops_when_idle_and_no_redis_or_celery_tasks_exist():
    with (
        patch(
            "app_ocr.tasks.get_last_ensure_at",
            return_value=make_last_ensure_at(
                seconds_ago=AUTOSTOP_THRESHOLD_SECONDS + 3,
            ),
        ),
        patch(
            "app_ocr.tasks.has_pending_gpu_worker_queue_tasks",
            return_value=False,
        ) as mock_has_pending_queue_tasks,
        patch(
            "app_ocr.tasks.has_active_or_reserved_gpu_worker_tasks",
            return_value=False,
        ) as mock_has_active_or_reserved_tasks,
        patch("app_ocr.tasks.stop_gpu_worker") as mock_stop_gpu_worker,
    ):
        check_gpu_worker_autostop_task()

    mock_has_pending_queue_tasks.assert_called_once_with("worker_document")
    mock_has_active_or_reserved_tasks.assert_called_once_with("worker_document")
    mock_stop_gpu_worker.assert_called_once_with("worker_document")
