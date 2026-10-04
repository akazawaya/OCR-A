from datetime import timedelta
from unittest.mock import patch

import pytest
from celery.contrib.testing.worker import start_worker
from celery.result import allow_join_result
from django.urls import reverse
from django.utils import timezone
from redis import Redis

from app_ocr.etc.tools import render_page
from app_ocr.models import Document, Page, State
from app_ocr.tasks import (
    check_document_ocr_timeout_task,
    ocr_page_task,
)
from project.celery import app as celery_app

TEST_OCR_QUEUE = "test_document_ocr_timeout_queue"

pytestmark = pytest.mark.django_db(transaction=True)


@pytest.fixture
def redis_client(settings):
    client = Redis.from_url(settings.CELERY_BROKER_URL)
    client.delete(TEST_OCR_QUEUE)

    yield client

    client.delete(TEST_OCR_QUEUE)


# 成功系
def test_document_ocr_sets_first_activity_once_and_updates_last_activity(
    settings,
    authenticated_client,
    uploaded_file_from_fixture_factory,
    django_capture_on_commit_callbacks,
):
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True
    settings.ENABLE_GPU_WORKER_AUTOSTART = False
    pdf_file = uploaded_file_from_fixture_factory(
        "sample.pdf",
        "application/pdf",
    )
    image_file = uploaded_file_from_fixture_factory(
        "table.jpg",
        "image/jpeg",
    )
    valid_image_bytes = render_page(
        file=image_file,
        page_number=1,  # 固定返り値用のbytesを1枚目で使いまわす
        input_ext="jpg",
    )
    document_at_page_start = {}

    def mock_run_yomitoku_on_rendered_page(document_id, page_number, bbox=None):
        current_document = Document.objects.get(pk=document_id)
        document_at_page_start[page_number] = current_document
        return current_document, valid_image_bytes, []

    with (
        patch(
            "app_ocr.service.ocr._run_yomitoku_on_rendered_page",
            side_effect=mock_run_yomitoku_on_rendered_page,
        ),
        django_capture_on_commit_callbacks(execute=True),
    ):
        response = authenticated_client.post(
            reverse("document-ocr"),
            data={"file": pdf_file},
            format="multipart",
        )

    document = Document.objects.get(pk=response.data["document"]["id"])
    first_page_start = document_at_page_start[1]
    second_page_start = document_at_page_start[2]
    last_page_start = document_at_page_start[document.total_pages]

    assert first_page_start.ocr_first_activity_at is not None
    assert first_page_start.ocr_last_activity_at is not None
    assert (
        second_page_start.ocr_first_activity_at
        == first_page_start.ocr_first_activity_at
    )
    assert (
        second_page_start.ocr_last_activity_at > first_page_start.ocr_last_activity_at
    )
    assert document.ocr_first_activity_at == first_page_start.ocr_first_activity_at
    assert document.ocr_last_activity_at > last_page_start.ocr_last_activity_at


# 失敗系
@pytest.mark.parametrize(
    "timeout_kind",
    ["total", "page"],
)
def test_document_ocr_timeout_marks_document_failed_and_skips_queued_page_task(
    settings,
    document_factory,
    redis_client,
    timeout_kind,
):
    settings.DOCUMENT_OCR_TOTAL_TIMEOUT_MINUTES = 60
    settings.DOCUMENT_OCR_PAGE_TIMEOUT_MINUTES = 15
    settings.GPU_WORKERS = []

    now = timezone.now()
    first_activity_at = now - timedelta(minutes=20)
    last_activity_at = now - timedelta(minutes=1)
    if timeout_kind == "total":
        first_activity_at = now - timedelta(minutes=61)
    else:
        last_activity_at = now - timedelta(minutes=16)

    document = document_factory(
        state=State.PROCESSING,
        total_pages=1,
    )
    Document.objects.filter(pk=document.id).update(
        ocr_first_activity_at=first_activity_at,
        ocr_last_activity_at=last_activity_at,
    )
    # DB上の活動時刻がタイムアウト閾値を超えている一方で、
    # Page OCRタスクがキューに残っている状態を再現する。
    # API経由ではこの状態を作りにくいため、
    # ocr_page_taskを直接テスト専用キューへ投入する。
    task_result = ocr_page_task.apply_async(
        args=(document.id, 1),
        queue=TEST_OCR_QUEUE,
    )
    assert redis_client.llen(TEST_OCR_QUEUE) == 1

    check_document_ocr_timeout_task()
    document.refresh_from_db()
    assert document.state == State.FAILED

    try:
        with start_worker(
            celery_app,
            concurrency=1,
            pool="threads",
            queues=[TEST_OCR_QUEUE],
            perform_ping_check=False,
        ):
            with allow_join_result():
                task_result.get(timeout=5)
    finally:
        task_result.forget()

    document.refresh_from_db()
    assert redis_client.llen(TEST_OCR_QUEUE) == 0
    assert document.state == State.FAILED
    assert not Page.objects.filter(doc=document).exists()
