from django.core.cache import cache

PREVIEW_WORD_OCR_CACHE_PREFIX = "preview_word_ocr"
PREVIEW_WORD_OCR_CACHE_TIMEOUT_SECONDS = 60 * 10


def build_preview_word_ocr_cache_key(job_id):
    return f"{PREVIEW_WORD_OCR_CACHE_PREFIX}:{job_id}"


def set_preview_word_ocr_job(job_id, payload):
    cache.set(
        build_preview_word_ocr_cache_key(job_id),
        payload,
        timeout=PREVIEW_WORD_OCR_CACHE_TIMEOUT_SECONDS,
    )


def get_preview_word_ocr_job(job_id):
    return cache.get(build_preview_word_ocr_cache_key(job_id))


def delete_preview_word_ocr_job(job_id):
    cache.delete(build_preview_word_ocr_cache_key(job_id))
