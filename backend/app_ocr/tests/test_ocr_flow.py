import json
from pathlib import Path
from unittest.mock import Mock, call, patch

import cv2
import numpy as np
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from app_ocr.consumers import OcrProgressConsumer
from app_ocr.etc.tools import inspect_file, render_page
from app_ocr.input_constraints import MAX_UPLOAD_FILE_SIZE
from app_ocr.models import Document, FileType, Page, State
from app_ocr.serializers import DocumentUploadSerializer
from app_ocr.tasks import (
    dispatch_ocr_pages_task,
    notify_document_state_changed,
    ocr_page_task,
)

FIXTURE_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def api_client():
    return APIClient()


def make_dummy_file(filename, content_type):
    return SimpleUploadedFile(
        filename,
        b"dummy content",
        content_type=content_type,
    )


def make_uploaded_file_from_fixture(filename, content_type):
    file_path = FIXTURE_DIR / filename
    return SimpleUploadedFile(
        name=filename,
        content=file_path.read_bytes(),
        content_type=content_type,
    )


"""
test_inspect_file
inspect_file関数をテストする。
実ファイルによるメタデータ二種の読み取りをテスト
"""


@pytest.mark.parametrize(
    "filename, content_type, expected_ext, expected_total_pages",
    [
        ("sample.pdf", "application/pdf", "pdf", 10),
        ("table.jpg", "image/jpeg", "jpg", 1),
    ],
)
def test_inspect_file(
    filename,
    content_type,
    expected_ext,
    expected_total_pages,
):
    file = make_uploaded_file_from_fixture(filename, content_type)
    ext, total_pages = inspect_file(file)

    assert ext == expected_ext
    assert total_pages == expected_total_pages


class TestRenderPage:
    @pytest.mark.parametrize(
        "filename, content_type, input_ext",
        [
            ("sample.pdf", "application/pdf", "pdf"),
            ("table.jpg", "image/jpeg", "jpg"),
        ],
    )
    def test_returns_decodable_png_bytes(
        self,
        filename,
        content_type,
        input_ext,
    ):
        file = make_uploaded_file_from_fixture(filename, content_type)

        img_bytes = render_page(file=file, page_number=1, input_ext=input_ext)

        assert isinstance(img_bytes, bytes)
        assert img_bytes.startswith(b"\x89PNG\r\n\x1a\n")

        decoded = cv2.imdecode(
            np.frombuffer(img_bytes, np.uint8),
            cv2.IMREAD_UNCHANGED,
        )
        assert decoded is not None
        assert decoded.shape[0] > 0
        assert decoded.shape[1] > 0

    @pytest.mark.parametrize(
        "filename, content_type, input_ext",
        [
            ("sample.pdf", "application/pdf", "pdf"),
            ("table.jpg", "image/jpeg", "jpg"),
        ],
    )
    def test_resets_file_pointer(
        self,
        filename,
        content_type,
        input_ext,
    ):
        file = make_uploaded_file_from_fixture(filename, content_type)
        render_page(file=file, page_number=1, input_ext=input_ext)
        assert file.tell() == 0

    def test_rejects_invalid_page_number(self):
        file = make_uploaded_file_from_fixture("table.jpg", "image/jpeg")

        with pytest.raises(ValueError, match="page_number must be 1-based"):
            render_page(file=file, page_number=0, input_ext="jpg")

    def test_rejects_unsupported_input_ext(self):
        file = make_uploaded_file_from_fixture("table.jpg", "image/jpeg")

        with pytest.raises(ValueError, match="Unsupported file format"):
            render_page(file=file, page_number=1, input_ext="txt")


class TestDocumentUploadSerializer:
    def test_rejects_unsupported_extension(self):
        serializer = DocumentUploadSerializer(
            data={"file": make_dummy_file("test.txt", "text/plain")}
        )

        assert not serializer.is_valid()
        assert str(serializer.errors["file"][0]) == "拡張子が非対応です。"
        assert serializer.errors["file"][0].code == "unsupported_extension"

    def test_rejects_too_large_file(self):
        file = SimpleUploadedFile(
            "too_large.jpg",
            b"a" * (MAX_UPLOAD_FILE_SIZE + 1),
            content_type="image/jpeg",
        )

        serializer = DocumentUploadSerializer(data={"file": file})

        assert not serializer.is_valid()
        assert str(serializer.errors["file"][0]) == "ファイルサイズが大きすぎます。"
        assert serializer.errors["file"][0].code == "file_too_large"

    def test_rejects_too_long_file_name(self):
        file = make_dummy_file(f"{'a' * 101}.jpg", "image/jpeg")
        serializer = DocumentUploadSerializer(data={"file": file})

        assert not serializer.is_valid()
        assert str(serializer.errors["file"][0]) == "ファイル名が長すぎます。"
        assert serializer.errors["file"][0].code == "file_name_too_long"


class TestStartOCR:
    @pytest.mark.parametrize(
        "filename, content_type, expected_status",
        [
            ("test.jpg", "image/jpeg", status.HTTP_202_ACCEPTED),
            ("test.jpeg", "image/jpeg", status.HTTP_202_ACCEPTED),
            ("test.png", "image/png", status.HTTP_202_ACCEPTED),
            ("test.txt", "text/plain", status.HTTP_400_BAD_REQUEST),
            ("test.tiff", "image/tiff", status.HTTP_400_BAD_REQUEST),
            ("test.bmp", "image/bmp", status.HTTP_400_BAD_REQUEST),
        ],
    )
    @pytest.mark.django_db
    def test_start_ocr_validates_file_extension(
        self,
        api_client,
        filename,
        content_type,
        expected_status,
    ):
        file = make_dummy_file(filename, content_type)
        url = reverse("document-start-ocr")
        payload = {"file": file}
        response = api_client.post(url, payload, format="multipart")

        assert response.status_code == expected_status

    @pytest.mark.django_db
    @pytest.mark.parametrize(
        "filename, content_type",
        [
            ("sample.pdf", "application/pdf"),
            ("table.jpg", "image/jpeg"),
        ],
    )
    def test_start_ocr_creates_document(
        self,
        api_client,
        filename,
        content_type,
    ):
        file = make_uploaded_file_from_fixture(filename, content_type)
        url = reverse("document-start-ocr")
        response = api_client.post(url, {"file": file}, format="multipart")
        created_document_id = response.data["document"]["id"]
        document = Document.objects.get(id=created_document_id)

        assert response.status_code == status.HTTP_202_ACCEPTED
        assert document.id == created_document_id


class TestTasks:
    def test_notify_document_state_changed_sends_group_message(self):
        with (
            patch("app_ocr.tasks.get_channel_layer") as mock_get_channel_layer,
            patch("app_ocr.tasks.async_to_sync") as mock_async_to_sync,
        ):
            mock_channel_layer = mock_get_channel_layer.return_value
            mock_group_send = mock_async_to_sync.return_value

            notify_document_state_changed(document_id=1, state=State.SUCCESS)

        mock_async_to_sync.assert_called_once_with(mock_channel_layer.group_send)
        mock_group_send.assert_called_once_with(
            "broadcast",
            {
                "type": "document_state_changed",
                "document_id": 1,
                "state": State.SUCCESS,
            },
        )

    @pytest.mark.django_db
    def test_dispatch_ocr_pages_task_sets_processing_and_dispatches_each_page(self):
        with (
            patch("app_ocr.tasks.notify_document_state_changed") as mock_notify,
            patch("app_ocr.tasks.ocr_page_task.delay") as mock_delay,
        ):
            doc = Document.objects.create(
                file_name="sample.pdf",
                file_type=FileType.PDF,
                total_pages=3,
            )

            dispatch_ocr_pages_task(document_id=doc.id)

        doc.refresh_from_db()

        assert doc.state == State.PROCESSING
        mock_notify.assert_called_once_with(
            document_id=doc.id,
            state=State.PROCESSING,
        )
        mock_delay.assert_has_calls(
            [
                call(doc.id, 1),
                call(doc.id, 2),
                call(doc.id, 3),
            ]
        )
        assert mock_delay.call_count == 3

    @pytest.mark.django_db
    def test_ocr_page_task_success_when_all_pages_finish(self):
        with (
            patch("app_ocr.tasks.run_ocr_for_page"),
            patch("app_ocr.tasks.notify_document_state_changed") as mock_notify,
        ):
            doc = Document.objects.create(
                file_name="sample.pdf",
                file_type=FileType.PDF,
                total_pages=2,
            )
            page1 = Page.objects.create(doc=doc, page_number=1)
            page2 = Page.objects.create(doc=doc, page_number=2)

            ocr_page_task(document_id=doc.id, page_number=page1.page_number)

            doc.refresh_from_db()
            page1.refresh_from_db()
            page2.refresh_from_db()

            assert page1.state == State.SUCCESS
            assert page2.state != State.SUCCESS
            assert doc.state != State.SUCCESS
            mock_notify.assert_not_called()

            ocr_page_task(document_id=doc.id, page_number=page2.page_number)

        doc.refresh_from_db()
        page2.refresh_from_db()

        assert page2.state == State.SUCCESS
        assert doc.state == State.SUCCESS
        mock_notify.assert_called_once_with(
            document_id=doc.id,
            state=State.SUCCESS,
        )

    @pytest.mark.django_db
    def test_ocr_page_task_failed_when_run_ocr_raises(self):
        with (
            patch(
                "app_ocr.tasks.run_ocr_for_page",
                side_effect=RuntimeError("ocr failed"),
            ),
            patch("app_ocr.tasks.notify_document_state_changed") as mock_notify,
        ):
            doc = Document.objects.create(
                file_name="sample.pdf",
                file_type=FileType.PDF,
                total_pages=1,
            )
            page = Page.objects.create(doc=doc, page_number=1)

            with pytest.raises(RuntimeError):
                ocr_page_task(document_id=doc.id, page_number=page.page_number)

        doc.refresh_from_db()
        page.refresh_from_db()

        assert page.state == State.FAILED
        assert doc.state == State.FAILED
        mock_notify.assert_called_once_with(
            document_id=doc.id,
            state=State.FAILED,
        )


class TestConsumer:
    def test_connect_accepts_and_joins_broadcast_group(self):
        consumer = OcrProgressConsumer()
        consumer.accept = Mock()
        consumer.channel_layer = Mock()
        consumer.channel_name = "test-channel"

        with patch("app_ocr.consumers.async_to_sync") as mock_async_to_sync:
            mock_group_add = mock_async_to_sync.return_value
            consumer.connect()

        consumer.accept.assert_called_once()
        assert consumer.group_name == "broadcast"
        mock_async_to_sync.assert_called_once_with(consumer.channel_layer.group_add)
        mock_group_add.assert_called_once_with("broadcast", "test-channel")

    def test_disconnect_leaves_broadcast_group(self):
        consumer = OcrProgressConsumer()
        consumer.group_name = "broadcast"
        consumer.channel_layer = Mock()
        consumer.channel_name = "test-channel"

        with patch("app_ocr.consumers.async_to_sync") as mock_async_to_sync:
            mock_group_discard = mock_async_to_sync.return_value
            consumer.disconnect(close_code=1000)

        mock_async_to_sync.assert_called_once_with(consumer.channel_layer.group_discard)
        mock_group_discard.assert_called_once_with("broadcast", "test-channel")

    # payloadの中身は暫定かつ未使用のため、そこまで深掘りしない
    def test_document_state_changed_sends_websocket_message(self):
        consumer = OcrProgressConsumer()
        consumer.send = Mock()
        consumer.document_state_changed(
            {
                "document_id": 1,
                "state": "SUCCESS",
            }
        )

        consumer.send.assert_called_once()
        sent_payload = json.loads(consumer.send.call_args.kwargs["text_data"])

        assert sent_payload["type"] == "document_state_changed"
