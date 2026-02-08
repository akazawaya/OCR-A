import time
from celery import shared_task

@shared_task
def ocr_page(doc_id, page_number):
    return {"ok": True}

