from pathlib import Path
from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status

from app_ocr.models import Document, Page

FIXTURE_DIR = Path(__file__).parent / "fixtures"


pytestmark = pytest.mark.django_db


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


class TestImportWithoutOcr:
    def test_import_produces_viewable_document(
        self,
        authenticated_client,
        settings,
        tmp_path,
    ):
        settings.MEDIA_ROOT = tmp_path
        file = make_uploaded_file_from_fixture("table.jpg", "image/jpeg")
        response = authenticated_client.post(
            reverse("document-list"),
            {"file": file},
            format="multipart",
        )

        document_id = response.data["id"]
        document = Document.objects.get(id=document_id)
        pages = list(document.pages.order_by("page_number"))

        assert response.status_code == status.HTTP_201_CREATED
        assert document.file.storage.exists(document.file.name)
        assert len(pages) == document.total_pages
        assert all(page.image for page in pages)
        assert all(page.image.storage.exists(page.image.name) for page in pages)

    def test_invalid_input_is_rejected_without_persistence(
        self,
        authenticated_client,
        settings,
        tmp_path,
    ):
        settings.MEDIA_ROOT = tmp_path
        file = make_dummy_file("test.txt", "text/plain")

        response = authenticated_client.post(
            reverse("document-list"),
            {"file": file},
            format="multipart",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert Document.objects.count() == 0
        assert Page.objects.count() == 0
        assert not any(path.is_file() for path in tmp_path.rglob("*"))

    def test_failure_after_persistence_removes_database_and_storage_resources(
        self,
        authenticated_client,
        settings,
        tmp_path,
    ):
        settings.MEDIA_ROOT = tmp_path
        file = make_uploaded_file_from_fixture("table.jpg", "image/jpeg")

        with patch(
            "app_ocr.views.create_pages_from_document_file",
            side_effect=RuntimeError("page creation failed"),
        ):
            with pytest.raises(RuntimeError):
                authenticated_client.post(
                    reverse("document-list"),
                    {"file": file},
                    format="multipart",
                )

        assert Document.objects.count() == 0
        assert Page.objects.count() == 0
        assert not any(path.is_file() for path in tmp_path.rglob("*"))


class TestImportWithOcr:
    def test_import_persists_input_and_schedules_ocr(
        self,
        authenticated_client,
        django_capture_on_commit_callbacks,
        settings,
        tmp_path,
    ):
        settings.MEDIA_ROOT = tmp_path
        file = make_uploaded_file_from_fixture("table.jpg", "image/jpeg")
        with (
            patch("app_ocr.views.notify_document_changed"),
            patch("app_ocr.views.dispatch_ocr_pages_task.delay") as mock_dispatch,
            django_capture_on_commit_callbacks(execute=True),
        ):
            response = authenticated_client.post(
                reverse("document-ocr"),
                {"file": file},
                format="multipart",
            )

        document_id = response.data["document"]["id"]
        document = Document.objects.get(id=document_id)

        assert response.status_code == status.HTTP_202_ACCEPTED
        assert document.file.storage.exists(document.file.name)
        assert Page.objects.filter(doc=document).count() == 0
        mock_dispatch.assert_called_once_with(document.id)

    def test_invalid_input_is_rejected_without_persistence(
        self,
        authenticated_client,
        settings,
        tmp_path,
    ):
        settings.MEDIA_ROOT = tmp_path
        file = make_dummy_file("test.txt", "text/plain")

        with patch("app_ocr.views.dispatch_ocr_pages_task.delay") as mock_dispatch:
            response = authenticated_client.post(
                reverse("document-ocr"),
                {"file": file},
                format="multipart",
            )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

        assert Document.objects.count() == 0
        assert Page.objects.count() == 0
        assert not any(path.is_file() for path in tmp_path.rglob("*"))
        mock_dispatch.assert_not_called()

    def test_failure_after_persistence_removes_database_and_storage_resources(
        self,
        authenticated_client,
        settings,
        tmp_path,
    ):
        settings.MEDIA_ROOT = tmp_path
        file = make_uploaded_file_from_fixture("table.jpg", "image/jpeg")

        with patch(
            "app_ocr.views.transaction.on_commit",
            side_effect=RuntimeError("on_commit failed"),
        ):
            with pytest.raises(RuntimeError):
                authenticated_client.post(
                    reverse("document-ocr"),
                    {"file": file},
                    format="multipart",
                )

        assert Document.objects.count() == 0
        assert Page.objects.count() == 0
        assert not any(path.is_file() for path in tmp_path.rglob("*"))
