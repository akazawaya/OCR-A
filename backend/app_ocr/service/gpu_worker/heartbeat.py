from datetime import datetime
from logging import getLogger

from django.core.cache import cache
from django.utils import timezone

logger = getLogger(__name__)

LAST_ENSURE_AT_CACHE_KEY = "gpu_worker:last_ensure_at:{instance_id}"


def _cache_key(instance_id):
    return LAST_ENSURE_AT_CACHE_KEY.format(instance_id=instance_id)


def mark_gpu_worker_ensured(instance_id):
    try:
        cache.set(_cache_key(instance_id), timezone.now().timestamp(), timeout=None)
    except Exception:
        logger.exception("Failed to record GPU worker heartbeat: %s", instance_id)


def get_last_ensure_at(instance_id):
    timestamp = cache.get(_cache_key(instance_id))
    if timestamp is None:
        return None

    return datetime.fromtimestamp(
        float(timestamp),
        tz=timezone.get_current_timezone(),
    )
