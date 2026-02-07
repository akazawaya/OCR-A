from celery import shared_task
from app_ocr.models import Document
from app_ocr.service.ocr import run_ocr_for_page

@shared_task
# dispatch 分配するタスク
def dispatch_ocr_pages_task(document_id):
    doc = Document.objects.only("id", "total_pages").get(pk=document_id)
    for page_number in range(1, doc.total_pages + 1):
        ocr_page_task.delay(document_id, page_number)

@shared_task
def ocr_page_task(document_id, page_number):
    run_ocr_for_page(document_id=document_id, page_number=page_number)
