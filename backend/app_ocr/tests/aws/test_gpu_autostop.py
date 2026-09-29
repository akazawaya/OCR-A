from datetime import timedelta
from threading import Event
from time import monotonic, sleep
from unittest.mock import Mock, patch

import pytest
from celery import shared_task
from celery.contrib.testing.worker import start_worker
from django.core.cache import cache
from django.utils import timezone
from redis import Redis

from app_ocr.service.gpu_worker.heartbeat import (
    LAST_ENSURE_AT_CACHE_KEY,
    mark_gpu_worker_ensured,
)
from app_ocr.tasks import check_gpu_worker_autostop_task
from project.celery import app as celery_app

# キューはbrokerのqueuedタスクと、
# worker内Requestのactive・reserved用の再現用に新設する。
QUEUED_QUEUE = "test_queued_task_queue"
RESERVED_QUEUE = "test_reserved_task_queue"
ACTIVE_QUEUE = "test_active_task_queue"
TEST_QUEUE_NAMES = (
    QUEUED_QUEUE,
    ACTIVE_QUEUE,
    RESERVED_QUEUE,
)

INSTANCE_ID = "i-gpu"


@pytest.fixture(autouse=True)
def configure_gpu_autostop_settings(settings):
    settings.ENABLE_GPU_WORKER_AUTOSTOP = True
    settings.GPU_WORKER_AUTOSTOP_IDLE_MINUTES = 0.1


@pytest.fixture
def queue_name(settings, worker_task_state):
    if worker_task_state == "active":
        queue_name = ACTIVE_QUEUE
    elif worker_task_state == "reserved":
        queue_name = RESERVED_QUEUE
    else:
        queue_name = QUEUED_QUEUE

    settings.GPU_WORKERS = [
        {
            "queues": TEST_QUEUE_NAMES,
            "instance_id": INSTANCE_ID,
        },
    ]
    return queue_name


# テスト境界
# Mock対象は、AWS APIへアクセスするec2_clientだけとする。
# Redis BrokerとDjango cacheには読み書きし、Celery Workerはstart_worker()で起動する。

# EC2
# describe_instancesでState: runningを返し、stop_instancesの呼び出しとIDを検証する。


def make_describe_instances_response(instance_id, state="running"):
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


@pytest.fixture
def ec2_client():
    client = Mock(
        spec_set=[
            "describe_instances",
            "stop_instances",
        ],
    )
    client.describe_instances.return_value = make_describe_instances_response(
        INSTANCE_ID,
        state="running",
    )
    with patch(
        "app_ocr.service.gpu_worker.worker_instance._get_ec2_client",
        return_value=client,
    ):
        yield client


# Redis
# Celery brokerとしてのqueuedタスクと、Django cacheとしてのheartbeatを設定し、
# 自動停止判定への入力状態を再現する。


@pytest.fixture
def redis_state(settings):
    redis_client = Redis.from_url(settings.CELERY_BROKER_URL)
    heartbeat_keys = [
        LAST_ENSURE_AT_CACHE_KEY.format(instance_id=INSTANCE_ID),
    ]
    # テスト開始前の初期化
    redis_client.delete(*TEST_QUEUE_NAMES)
    cache.delete_many(heartbeat_keys)

    yield redis_client

    # テスト終了後の後片付け
    redis_client.delete(*TEST_QUEUE_NAMES)
    cache.delete_many(heartbeat_keys)


# Celery
# start_worker()でWorkerを起動する。
# taskはテスト用に新規作成し、Inspectorからactive・reservedを観測する。
# Beatは起動せず、自動停止判定タスク(check_gpu_worker_autostop_task)を直接呼び出す。

release_task = Event()


@shared_task(
    name="tests.controllable_gpu_task",
    ignore_result=True,
)
def controllable_gpu_task():
    release_task.wait()


def running_celery_worker(*queue_names):
    return start_worker(
        celery_app,
        concurrency=1,
        pool="threads",
        queues=list(queue_names),
        perform_ping_check=False,
    )


def worker_has_task_in_state(queue_name, worker_task_state):
    inspector = celery_app.control.inspect(timeout=0.5)
    worker_tasks_by_hostname = getattr(inspector, worker_task_state)() or {}

    return any(
        (task.get("delivery_info") or {}).get("routing_key") == queue_name
        for tasks in worker_tasks_by_hostname.values()
        for task in tasks
    )


def wait_for_worker_task_state(queue_name, worker_task_state, timeout=5):
    deadline = monotonic() + timeout

    while monotonic() < deadline:
        if worker_has_task_in_state(queue_name, worker_task_state):
            return
        sleep(0.05)

    pytest.fail(
        f"Celery task did not become {worker_task_state!r} on queue {queue_name!r}",
    )


# 共通層（結合用）
# Redis BrokerとCelery Workerの状態をテストケースごとに組み立てる。
@pytest.fixture
def arranged_gpu_workload(
    queue_name,
    broker_has_queued_task,
    worker_task_state,
    redis_state,
):
    if broker_has_queued_task:
        controllable_gpu_task.apply_async(queue=queue_name)
        yield
        return

    if worker_task_state is None:
        with running_celery_worker(queue_name):
            yield
        return

    release_task.clear()
    # ACTIVE_QUEUE, RESERVED_QUEUEのキューを同時に購読させる
    # タスク投下の際はqueueで該当キューのみ指定する
    with running_celery_worker(ACTIVE_QUEUE, RESERVED_QUEUE):
        try:
            controllable_gpu_task.apply_async(queue=ACTIVE_QUEUE)
            wait_for_worker_task_state(ACTIVE_QUEUE, "active")

            if worker_task_state == "reserved":
                # reservedの場合は先行タスクがいないと即activeに移行してしまう。
                # よってACTIVE_QUEUEの終了しないタスクで実行枠を占有し、
                # RESERVED_QUEUEのタスクをreserved状態にする。
                # このとき、自動停止判定関数check_gpu_worker_autostop_task()は
                # 対象キューのタスクだけを参照するため、
                # reservedのテストケースにactiveを混同することはない。
                controllable_gpu_task.apply_async(queue=RESERVED_QUEUE)
                wait_for_worker_task_state(RESERVED_QUEUE, "reserved")

            yield
        finally:
            release_task.set()


@pytest.mark.parametrize(
    (
        "recently_used",
        "broker_has_queued_task",
        "worker_task_state",
        "should_stop",
    ),
    [
        (False, False, None, True),
        (True, False, None, False),
        (False, True, None, False),
        (False, False, "active", False),
        (False, False, "reserved", False),
    ],
)
def test_gpu_worker_autostop(
    settings,
    ec2_client,
    recently_used,
    arranged_gpu_workload,  # broker_has_queued_taskとworker_task_stateはここに統合
    should_stop,
):
    # heartbeat登録処理でrecently_usedの状態を作成
    idle_threshold = timedelta(
        minutes=settings.GPU_WORKER_AUTOSTOP_IDLE_MINUTES,
    )
    last_ensure_at = timezone.now()
    if not recently_used:
        last_ensure_at -= idle_threshold + timedelta(seconds=1)

    with patch(
        "app_ocr.service.gpu_worker.heartbeat.timezone.now",
        return_value=last_ensure_at,
    ):
        mark_gpu_worker_ensured(INSTANCE_ID)

    check_gpu_worker_autostop_task()

    if should_stop:
        ec2_client.stop_instances.assert_called_once_with(
            InstanceIds=[INSTANCE_ID],
        )
    else:
        ec2_client.stop_instances.assert_not_called()
