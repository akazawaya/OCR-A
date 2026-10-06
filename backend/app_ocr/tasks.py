from datetime import timedelta

from asgiref.sync import async_to_sync
from celery import Task, shared_task
from channels.layers import get_channel_layer
from django.conf import settings
from django.db.models import Q
from django.utils import timezone

from app_ocr.channel_groups import get_ocr_progress_group_name
from app_ocr.models import Document, GpuWorkerLease, Page, State
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

    now = timezone.now()
    for gpu_worker in settings.GPU_WORKERS:
        instance_id = gpu_worker["instance_id"]
        queue_names = gpu_worker["queues"]
        has_expired_lease = GpuWorkerLease.objects.filter(
            instance_id=instance_id,
            keep_alive_until__lte=now,
        ).exists()
        if not has_expired_lease:
            continue
        if has_pending_gpu_worker_queue_tasks(queue_names):
            continue
        if has_active_or_reserved_gpu_worker_tasks(queue_names):
            continue
        stop_gpu_worker(instance_id)


@shared_task
def check_document_ocr_timeout_task():
    now = timezone.now()
    total_timeout_at = now - timedelta(
        minutes=settings.DOCUMENT_OCR_TOTAL_TIMEOUT_MINUTES,
    )
    page_timeout_at = now - timedelta(
        minutes=settings.DOCUMENT_OCR_PAGE_TIMEOUT_MINUTES,
    )
    timeout_condition = Q(ocr_first_activity_at__lte=total_timeout_at) | Q(
        ocr_last_activity_at__lte=page_timeout_at
    )
    timed_out_documents = list(
        Document.objects.filter(state=State.PROCESSING)
        .filter(timeout_condition)
        .values_list("pk", "owner_id")
    )

    for document_id, owner_id in timed_out_documents:
        # 取得後に別経路でSUCCESSやFAILEDへ遷移する可能性があるため、
        # 重ねてfilter(state=State.PROCESSING)を実施しておく
        updated = (
            Document.objects.filter(
                pk=document_id,
                state=State.PROCESSING,
            )
            .filter(timeout_condition)
            .update(state=State.FAILED)
        )
        if updated:
            notify_document_changed(owner_id)


@shared_task
# dispatch 分配するタスク
def dispatch_ocr_pages_task(document_id):
    doc = Document.objects.get(pk=document_id)
    if doc.state == State.FAILED:
        return

    Document.objects.filter(pk=document_id).update(state=State.PROCESSING)
    notify_document_changed(doc.owner_id)
    for page_number in range(1, doc.total_pages + 1):
        has_failed = Document.objects.filter(
            pk=document_id,
            state=State.FAILED,
        ).exists()
        if has_failed:
            return
        ocr_page_task.delay(document_id, page_number)


@shared_task
def ocr_page_task(document_id, page_number):
    doc = Document.objects.get(pk=document_id)
    if doc.state == State.FAILED:
        return

    now = timezone.now()
    # NULLの場合だけ最初の時刻を設定
    Document.objects.filter(
        pk=document_id,
        ocr_first_activity_at__isnull=True,
    ).update(ocr_first_activity_at=now)
    # 毎回、最新時刻を更新
    Document.objects.filter(pk=document_id).update(ocr_last_activity_at=now)

    try:
        result = run_ocr_for_page(
            document_id=document_id,
            page_number=page_number,
        )
    except Exception:
        Page.objects.filter(doc_id=document_id, page_number=page_number).update(
            state=State.FAILED
        )
        Document.objects.filter(pk=document_id).update(state=State.FAILED)
        notify_document_changed(doc.owner_id)
        raise

    if result is None:
        return

    updated_count = (
        Document.objects.filter(pk=document_id)
        .exclude(state=State.FAILED)
        .update(ocr_last_activity_at=timezone.now())
    )
    if not updated_count:
        return

    Page.objects.filter(doc_id=document_id, page_number=page_number).update(
        state=State.SUCCESS
    )

    success_count = Page.objects.filter(doc_id=document_id, state=State.SUCCESS).count()
    failed_exists = Page.objects.filter(doc_id=document_id, state=State.FAILED).exists()

    if (not failed_exists) and (success_count == doc.total_pages):
        completed = (
            Document.objects.filter(pk=document_id)
            .exclude(
                state=State.FAILED,
            )
            .update(state=State.SUCCESS)
        )
        if completed:
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
