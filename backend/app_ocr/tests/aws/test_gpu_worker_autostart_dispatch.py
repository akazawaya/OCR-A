from unittest.mock import Mock, call, patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


def make_uploaded_pdf():
    return SimpleUploadedFile(
        "sample.pdf",
        b"dummy content",
        content_type="application/pdf",
    )


@pytest.mark.django_db
def test_ocr_ensures_gpu_worker_before_dispatching_pages(
    api_client,
    django_capture_on_commit_callbacks,
    settings,
    tmp_path,
):
    settings.ENABLE_GPU_WORKER_AUTOSTART = True
    settings.MEDIA_ROOT = tmp_path
    call_order = Mock()
    # document-ocrのみ内部でのdb書込みを伴うため、transaction コールバックの順序を検証。
    # django_capture_on_commit_callbacksにより、
    # withブロック内での transaction.on_commit コールバックの実行を保障する
    with (
        patch("app_ocr.views.inspect_file", return_value=("pdf", 1)),
        patch("app_ocr.views.notify_document_changed"),
        patch(
            "app_ocr.views.ensure_gpu_worker_running",
            side_effect=lambda worker_type: call_order.ensure(worker_type),
            create=True,
        ) as mock_ensure_gpu_worker_running,
        patch(
            "app_ocr.views.dispatch_ocr_pages_task.delay",
            side_effect=lambda document_id: call_order.dispatch(document_id),
        ) as mock_dispatch_ocr_pages_task,
        django_capture_on_commit_callbacks(execute=True),
    ):
        response = api_client.post(
            "/documents/ocr/",
            {"file": make_uploaded_pdf()},
            format="multipart",
        )

    assert response.status_code == 202
    mock_ensure_gpu_worker_running.assert_called_once_with("worker_document")
    mock_dispatch_ocr_pages_task.assert_called_once_with(
        response.data["document"]["id"],
    )
    assert call_order.mock_calls == [
        call.ensure("worker_document"),
        call.dispatch(response.data["document"]["id"]),
    ]


@pytest.mark.django_db
def test_word_ocr_ensures_gpu_worker_before_dispatching_task(
    api_client,
    settings,
):
    settings.ENABLE_GPU_WORKER_AUTOSTART = True
    call_order = Mock()
    # previewWord-ocrの書込みはredis-cache内でありロールバック不可のため、
    # こちらはdjango_capture_on_commit_callbacksが不要。
    with (
        patch("app_ocr.views.uuid4", return_value="preview-job-1"),
        patch("app_ocr.views.set_preview_word_ocr_job"),
        patch(
            "app_ocr.views.ensure_gpu_worker_running",
            side_effect=lambda worker_type: call_order.ensure(worker_type),
            create=True,
        ) as mock_ensure_gpu_worker_running,
        patch(
            "app_ocr.views.ocr_word_task.apply_async",
            side_effect=lambda **kwargs: call_order.dispatch(**kwargs),
        ) as mock_apply_async,
    ):
        response = api_client.post(
            "/words/ocr/",
            {
                "mode": "rewrite_content",
                "preview_id": "preview:1",
                "doc": 1,
                "page_number": 2,
                "bbox": [1, 1, 20, 12],
            },
            format="json",
        )

    assert response.status_code == 202
    mock_ensure_gpu_worker_running.assert_called_once_with("worker_preview_word")
    mock_apply_async.assert_called_once_with(
        args=["preview-job-1"],
        queue="ocr_word_queue",
    )
    assert call_order.mock_calls == [
        call.ensure("worker_preview_word"),
        call.dispatch(args=["preview-job-1"], queue="ocr_word_queue"),
    ]
