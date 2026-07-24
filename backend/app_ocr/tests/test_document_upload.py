from pathlib import Path
from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework import status

from app_ocr.models import Document, Page

FIXTURE_DIR = Path(__file__).parent / "fixtures"


pytestmark = pytest.mark.django_db


def assert_no_document_upload_resources_remain(tmp_path):
    assert Document.objects.count() == 0
    assert Page.objects.count() == 0
    assert not any(path.is_file() for path in tmp_path.rglob("*"))


# Failedはwithout_ocr,with_ocrの双方でアサートが似通っているため、parametrizeで共通化
# 対してSuccessはアサートしたいデータ対象が異なるため、
# without_ocr,with_ocrを個別でテストケースを用意する
class TestSuccessfulDocumentUpload:
    def test_without_ocr_generates_page_images(
        self,
        uploaded_file_from_fixture_factory,
        authenticated_client,
        settings,
        tmp_path,
    ):
        settings.MEDIA_ROOT = tmp_path
        file = uploaded_file_from_fixture_factory()
        response = authenticated_client.post(
            reverse("document-list"),
            {"file": file},
            format="multipart",
        )

        assert response.status_code == status.HTTP_201_CREATED

        document_id = response.data["id"]
        document = Document.objects.get(id=document_id)
        pages = list(document.pages.order_by("page_number"))

        assert document.file.storage.exists(document.file.name)
        assert [page.page_number for page in pages] == list(
            range(1, document.total_pages + 1)
        )
        assert all(page.image for page in pages)
        assert all(page.image.storage.exists(page.image.name) for page in pages)

    def test_with_ocr_schedules_ocr_without_creating_pages(
        self,
        uploaded_file_from_fixture_factory,
        authenticated_client,
        django_capture_on_commit_callbacks,
        settings,
        tmp_path,
    ):
        settings.MEDIA_ROOT = tmp_path
        file = uploaded_file_from_fixture_factory()
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


class TestFailedDocumentUpload:
    @pytest.mark.parametrize(
        "route_name",
        ["document-list", "document-ocr"],
        ids=["without_ocr", "with_ocr"],
    )
    def test_rejects_invalid_input_without_persistence(
        self,
        dummy_file_factory,
        authenticated_client,
        route_name,
        settings,
        tmp_path,
    ):
        settings.MEDIA_ROOT = tmp_path
        file = dummy_file_factory("test.txt", "text/plain")

        with patch("app_ocr.views.dispatch_ocr_pages_task.delay") as mock_dispatch:
            response = authenticated_client.post(
                reverse(route_name),
                {"file": file},
                format="multipart",
            )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert_no_document_upload_resources_remain(tmp_path)
        mock_dispatch.assert_not_called()

    @pytest.mark.parametrize(
        ("route_name", "patch_target"),
        [
            ("document-list", "app_ocr.views.create_pages_from_document_file"),
            ("document-ocr", "app_ocr.views.transaction.on_commit"),
        ],
        ids=["without_ocr", "with_ocr"],
    )
    def test_rolls_back_saved_resources_on_failure(
        self,
        uploaded_file_from_fixture_factory,
        authenticated_client,
        route_name,
        patch_target,
        settings,
        tmp_path,
    ):
        settings.MEDIA_ROOT = tmp_path
        file = uploaded_file_from_fixture_factory()

        with patch(patch_target, side_effect=RuntimeError("forced failure")):
            with pytest.raises(RuntimeError):
                authenticated_client.post(
                    reverse(route_name),
                    {"file": file},
                    format="multipart",
                )

        assert_no_document_upload_resources_remain(tmp_path)
