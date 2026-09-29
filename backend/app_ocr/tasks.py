from datetime import timedelta

from asgiref.sync import async_to_sync
from celery import Task, shared_task
from channels.layers import get_channel_layer
from django.conf import settings
from django.utils import timezone

from app_ocr.channel_groups import get_ocr_progress_group_name
from app_ocr.models import Document, Page, State
from app_ocr.service.gpu_worker.heartbeat import get_last_ensure_at
from app_ocr.service.gpu_worker.task_checker import (
    has_active_or_reserved_gpu_worker_tasks,
    has_pending_gpu_worker_queue_tasks,
)
from app_ocr.service.gpu_worker.worker_instance import stop_gpu_worker
from app_ocr.service.ocr import run_ocr_for_bbox, run_ocr_for_page


def notify_document_changed(user_id):
    channel_layer = get_channel_layer()
    group_name = get_ocr_progress_group_name(user_id)
    async_to_sync(channel_layer.group_send)(
        group_name,  # Consumerの self.group_name
        {
            "type": "document_changed",  # Consumerのハンドラ名
        },
    )


def notify_preview_word_ocr_changed(user_id, preview_job_id, state):
    channel_layer = get_channel_layer()
    group_name = get_ocr_progress_group_name(user_id)
    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type": "preview_word_ocr_changed",
            "preview_job_id": preview_job_id,
            "state": state,
        },
    )


class PreviewWordOcrTask(Task):
    def on_success(self, retval, task_id, args, kwargs):
        user_id = kwargs["notification_user_id"]
        notify_preview_word_ocr_changed(user_id, task_id, State.SUCCESS)

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        user_id = kwargs["notification_user_id"]
        notify_preview_word_ocr_changed(user_id, task_id, State.FAILED)


@shared_task
def check_gpu_worker_autostop_task():
    if not settings.ENABLE_GPU_WORKER_AUTOSTOP:
        return

    idle_threshold = timedelta(
        minutes=settings.GPU_WORKER_AUTOSTOP_IDLE_MINUTES,
    )
    now = timezone.now()
    for gpu_worker in settings.GPU_WORKERS:
        instance_id = gpu_worker["instance_id"]
        queue_names = gpu_worker["queues"]
        last_ensure_at = get_last_ensure_at(instance_id)
        if last_ensure_at is None:
            continue
        if now - last_ensure_at < idle_threshold:
            continue
        if has_pending_gpu_worker_queue_tasks(queue_names):
            continue
        if has_active_or_reserved_gpu_worker_tasks(queue_names):
            continue
        stop_gpu_worker(instance_id)


@shared_task
# dispatch 分配するタスク
def dispatch_ocr_pages_task(document_id):
    doc = Document.objects.get(pk=document_id)
    Document.objects.filter(pk=document_id).update(state=State.PROCESSING)
    notify_document_changed(doc.owner_id)
    for page_number in range(1, doc.total_pages + 1):
        ocr_page_task.delay(document_id, page_number)


@shared_task
def ocr_page_task(document_id, page_number):
    doc = Document.objects.get(pk=document_id)
    try:
        run_ocr_for_page(document_id=document_id, page_number=page_number)
    except Exception:
        Page.objects.filter(doc_id=document_id, page_number=page_number).update(
            state=State.FAILED
        )
        Document.objects.filter(pk=document_id).update(state=State.FAILED)
        notify_document_changed(doc.owner_id)
        raise
    else:
        Page.objects.filter(doc_id=document_id, page_number=page_number).update(
            state=State.SUCCESS
        )

        success_count = Page.objects.filter(
            doc_id=document_id, state=State.SUCCESS
        ).count()
        failed_exists = Page.objects.filter(
            doc_id=document_id, state=State.FAILED
        ).exists()

        if (not failed_exists) and (success_count == doc.total_pages):
            Document.objects.filter(pk=document_id).update(state=State.SUCCESS)
            notify_document_changed(doc.owner_id)


@shared_task(base=PreviewWordOcrTask)
def ocr_word_task(
    *,
    notification_user_id,
    mode,
    preview_id,
    doc,
    page_number,
    bbox,
):
    words = run_ocr_for_bbox(
        document_id=doc,
        page_number=page_number,
        bbox=bbox,
    )
    result = {
        "mode": mode,
        "preview_id": preview_id,
    }
    if mode == "replace_words":
        result["words"] = words
    if mode == "rewrite_content":
        result["content"] = "".join(word.get("content", "") for word in words)
    return result
