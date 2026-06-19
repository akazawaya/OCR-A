from datetime import timedelta

from asgiref.sync import async_to_sync
from celery import shared_task
from channels.layers import get_channel_layer
from django.conf import settings
from django.utils import timezone

from app_ocr.models import Document, Page, State
from app_ocr.service.gpu_worker.heartbeat import get_last_ensure_at
from app_ocr.service.gpu_worker.task_checker import (
    has_active_or_reserved_gpu_worker_tasks,
    has_pending_gpu_worker_queue_tasks,
)
from app_ocr.service.gpu_worker.worker_instance import stop_gpu_worker
from app_ocr.service.ocr import run_ocr_for_bbox, run_ocr_for_page
from app_ocr.service.preview_word_ocr_cache import (
    get_preview_word_ocr_job,
    set_preview_word_ocr_job,
)


def notify_document_changed():
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "broadcast",  # Consumerの self.group_name
        {
            "type": "document_changed",  # Consumerのハンドラ名
        },
    )


def notify_preview_word_ocr_changed(preview_job_id, state):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "broadcast",
        {
            "type": "preview_word_ocr_changed",
            "preview_job_id": preview_job_id,
            "state": state,
        },
    )


@shared_task
def check_gpu_worker_autostop_task():
    if not settings.ENABLE_GPU_WORKER_AUTOSTOP:
        return

    idle_threshold = timedelta(
        minutes=settings.GPU_WORKER_AUTOSTOP_IDLE_MINUTES,
    )
    now = timezone.now()
    for worker_type in settings.GPU_WORKER_INSTANCE_IDS:
        last_ensure_at = get_last_ensure_at(worker_type)
        if last_ensure_at is None:
            continue
        if now - last_ensure_at < idle_threshold:
            continue
        if has_pending_gpu_worker_queue_tasks(worker_type):
            continue
        if has_active_or_reserved_gpu_worker_tasks(worker_type):
            continue
        stop_gpu_worker(worker_type)


@shared_task
# dispatch 分配するタスク
def dispatch_ocr_pages_task(document_id):
    doc = Document.objects.get(pk=document_id)
    Document.objects.filter(pk=document_id).update(state=State.PROCESSING)
    notify_document_changed()
    for page_number in range(1, doc.total_pages + 1):
        ocr_page_task.delay(document_id, page_number)


@shared_task
def ocr_page_task(document_id, page_number):
    try:
        run_ocr_for_page(document_id=document_id, page_number=page_number)
    except Exception:
        Page.objects.filter(doc_id=document_id, page_number=page_number).update(
            state=State.FAILED
        )
        Document.objects.filter(pk=document_id).update(state=State.FAILED)
        notify_document_changed()
        raise
    else:
        Page.objects.filter(doc_id=document_id, page_number=page_number).update(
            state=State.SUCCESS
        )

        doc = Document.objects.get(pk=document_id)
        success_count = Page.objects.filter(
            doc_id=document_id, state=State.SUCCESS
        ).count()
        failed_exists = Page.objects.filter(
            doc_id=document_id, state=State.FAILED
        ).exists()

        if (not failed_exists) and (success_count == doc.total_pages):
            Document.objects.filter(pk=document_id).update(state=State.SUCCESS)
            notify_document_changed()


@shared_task
def ocr_word_task(preview_job_id):
    job = get_preview_word_ocr_job(preview_job_id)
    if job is None:
        return

    job["state"] = State.PROCESSING
    set_preview_word_ocr_job(preview_job_id, job)
    try:
        words = run_ocr_for_bbox(
            document_id=job["doc"],
            page_number=job["page_number"],
            bbox=job["bbox"],
        )
        job["state"] = State.SUCCESS
        if job["mode"] == "replace_words":
            job["words"] = words
        if job["mode"] == "rewrite_content":
            job["content"] = "".join(word.get("content", "") for word in words)
        set_preview_word_ocr_job(preview_job_id, job)
        notify_preview_word_ocr_changed(preview_job_id, job["state"])
    except Exception as e:
        job["state"] = State.FAILED
        job["error_message"] = str(e)
        set_preview_word_ocr_job(preview_job_id, job)
        notify_preview_word_ocr_changed(preview_job_id, job["state"])
        raise
