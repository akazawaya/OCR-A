from django.conf import settings
from redis import Redis


def _get_broker_redis_client():
    return Redis.from_url(settings.CELERY_BROKER_URL)


def has_pending_gpu_worker_queue_tasks(queue_names):
    redis_client = _get_broker_redis_client()

    return any(redis_client.llen(queue_name) > 0 for queue_name in queue_names)


def _task_matches_queues(task, queue_names):
    delivery_info = task.get("delivery_info") or {}
    return delivery_info.get("routing_key") in queue_names


def _has_tasks_for_queues(worker_tasks_by_hostname, queue_names):
    if not worker_tasks_by_hostname:
        return False

    for tasks in worker_tasks_by_hostname.values():
        if any(_task_matches_queues(task, queue_names) for task in tasks):
            return True

    return False


def has_active_or_reserved_gpu_worker_tasks(queue_names):
    from project.celery import app as celery_app

    inspector = celery_app.control.inspect()
    return _has_tasks_for_queues(
        inspector.active(),
        queue_names,
    ) or _has_tasks_for_queues(
        inspector.reserved(),
        queue_names,
    )
