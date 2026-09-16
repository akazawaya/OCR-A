from datetime import datetime
from logging import getLogger

from django.core.cache import cache
from django.utils import timezone

logger = getLogger(__name__)

LAST_ENSURE_AT_CACHE_KEY = "gpu_worker:last_ensure_at:{worker_type}"


def _cache_key(worker_type):
    return LAST_ENSURE_AT_CACHE_KEY.format(worker_type=worker_type)


def mark_gpu_worker_ensured(worker_type):
    try:
        cache.set(_cache_key(worker_type), timezone.now().timestamp(), timeout=None)
    except Exception:
        logger.exception("Failed to record GPU worker heartbeat: %s", worker_type)


def get_last_ensure_at(worker_type):
    timestamp = cache.get(_cache_key(worker_type))
    if timestamp is None:
        return None

    return datetime.fromtimestamp(
        float(timestamp),
        tz=timezone.get_current_timezone(),
    )
