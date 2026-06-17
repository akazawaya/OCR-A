from django.conf import settings
from redis import Redis


def _get_worker_queue(worker_type):
    try:
        queue_name = settings.GPU_WORKER_QUEUES[worker_type]
    except KeyError as exc:
        raise KeyError(f"Unknown worker_type: {worker_type}") from exc

    if not queue_name:
        raise ValueError(f"Missing queue for worker_type: {worker_type}")

    return queue_name


def _get_broker_redis_client():
    return Redis.from_url(settings.CELERY_BROKER_URL)


def has_pending_gpu_worker_queue_tasks(worker_type):
    queue_name = _get_worker_queue(worker_type)
    redis_client = _get_broker_redis_client()

    return redis_client.llen(queue_name) > 0


def _task_matches_queue(task, queue_name):
    delivery_info = task.get("delivery_info") or {}
    return delivery_info.get("routing_key") == queue_name


def _has_tasks_for_queue(worker_tasks_by_hostname, queue_name):
    if not worker_tasks_by_hostname:
        return False

    for tasks in worker_tasks_by_hostname.values():
        if any(_task_matches_queue(task, queue_name) for task in tasks):
            return True

    return False


def has_active_or_reserved_gpu_worker_tasks(worker_type):
    queue_name = _get_worker_queue(worker_type)

    from project.celery import app as celery_app

    inspector = celery_app.control.inspect()
    return _has_tasks_for_queue(
        inspector.active(),
        queue_name,
    ) or _has_tasks_for_queue(
        inspector.reserved(),
        queue_name,
    )
