from celery import shared_task
from app_ocr.models import State, Document, Page
from app_ocr.service.ocr import run_ocr_for_page

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def notify_document_state_changed(document_id, state):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "broadcast",  # Consumerの self.group_name
        {
            "type": "document_state_changed",  # Consumerのハンドラ名
            "document_id": document_id,
            "state": state,
        },
    )


@shared_task
# dispatch 分配するタスク
def dispatch_ocr_pages_task(document_id):
    doc = Document.objects.get(pk=document_id)
    Document.objects.filter(pk=document_id).update(state=State.PROCESSING)
    notify_document_state_changed(document_id=document_id, state=State.PROCESSING)
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
        notify_document_state_changed(document_id=document_id, state=State.FAILED)
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
            notify_document_state_changed(document_id=document_id, state=State.SUCCESS)
