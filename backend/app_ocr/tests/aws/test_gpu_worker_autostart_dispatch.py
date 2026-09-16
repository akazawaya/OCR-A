from types import SimpleNamespace
from unittest.mock import Mock, call, patch

import pytest
from django.urls import reverse


@pytest.mark.django_db
def test_ocr_ensures_gpu_worker_before_dispatching_pages(
    authenticated_client,
    django_capture_on_commit_callbacks,
    dummy_file_factory,
    isolated_media_storage,
    settings,
):
    settings.ENABLE_GPU_WORKER_AUTOSTART = True
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
        response = authenticated_client.post(
            reverse("document-ocr"),
            {"file": dummy_file_factory()},
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
    authenticated_client,
    document_factory,
    page_factory,
    preview_word_ocr_request_factory,
    settings,
):
    settings.ENABLE_GPU_WORKER_AUTOSTART = True
    call_order = Mock()

    def dispatch(**kwargs):
        call_order.dispatch(**kwargs)
        return SimpleNamespace(id="preview-job-1")

    with (
        patch(
            "app_ocr.views.ensure_gpu_worker_running",
            side_effect=lambda worker_type: call_order.ensure(worker_type),
            create=True,
        ) as mock_ensure_gpu_worker_running,
        patch(
            "app_ocr.views.ocr_word_task.delay",
            side_effect=dispatch,
        ) as mock_delay,
    ):
        document = document_factory(
            owner=authenticated_client.user,
            file_name="limited.pdf",
        )
        page_factory(doc=document)
        request_payload = preview_word_ocr_request_factory(document=document)
        response = authenticated_client.post(
            reverse("word-ocr"),
            request_payload,
            format="json",
        )

    assert response.status_code == 202
    mock_ensure_gpu_worker_running.assert_called_once_with("worker_preview_word")
    mock_delay.assert_called_once_with(
        **request_payload,
        notification_user_id=authenticated_client.user.pk,
    )
    assert call_order.mock_calls == [
        call.ensure("worker_preview_word"),
        call.dispatch(
            **request_payload,
            notification_user_id=authenticated_client.user.pk,
        ),
    ]
