from django.conf import settings
from django.http import JsonResponse
from redis import Redis
from redis.exceptions import RedisError


def health_check(request):
    try:
        with Redis.from_url(settings.CELERY_BROKER_URL) as redis_client:
            redis_client.ping()
    except RedisError:
        return JsonResponse(
            {"status": "error", "redis": "unavailable"},
            status=503,
        )

    return JsonResponse({"status": "ok"})
