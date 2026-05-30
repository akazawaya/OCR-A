from pathlib import Path

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from app_ocr.models import Document, Page, State, Word

FIXTURE_DIR = Path(__file__).parent / "fixtures"

pytestmark = pytest.mark.django_db


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


@pytest.fixture
def ocr_fixture_data():
    document_file = make_uploaded_file_from_fixture("table.jpg", "image/jpeg")
    page_image = make_uploaded_file_from_fixture("table.jpg", "image/jpeg")

    document = Document.objects.create(
        file=document_file,
        file_name="table.jpg",
        file_type=1,
        total_pages=1,
    )
    page = Page.objects.create(
        doc=document,
        image=page_image,
        page_number=1,
        width_px=100,
        height_px=100,
    )
    word = Word.objects.create(
        page=page,
        bbox=[[0, 0], [10, 0], [10, 10], [0, 10]],
        direction=1,
    )
    return document, page, word


class TestDocumentApi:
    def test_create_document_creates_document_and_pages(self, api_client):
        file = make_uploaded_file_from_fixture("table.jpg", "image/jpeg")
        response = api_client.post(
            reverse("document-list"),
            {"file": file},
            format="multipart",
        )

        document_id = response.data["id"]
        document = Document.objects.get(id=document_id)

        assert response.status_code == status.HTTP_201_CREATED
        assert document.file_name == "table.jpg"
        assert document.state == State.SUCCESS
        assert Page.objects.filter(doc=document).count() == 1

    def test_create_document_rejects_invalid_file(self, api_client):
        file = make_dummy_file("test.txt", "text/plain")

        response = api_client.post(
            reverse("document-list"),
            {"file": file},
            format="multipart",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert Document.objects.count() == 0
        assert Page.objects.count() == 0

    def test_start_ocr_creates_document_and_dispatches_task(self, api_client):
        file = make_uploaded_file_from_fixture("table.jpg", "image/jpeg")
        response = api_client.post(
            reverse("document-start-ocr"),
            {"file": file},
            format="multipart",
        )

        document_id = response.data["document"]["id"]
        document = Document.objects.get(id=document_id)

        assert response.status_code == status.HTTP_202_ACCEPTED
        assert document.file_name == "table.jpg"
        assert Page.objects.filter(doc=document).count() == 0

    def test_start_ocr_rejects_invalid_file(self, api_client):
        file = make_dummy_file("test.txt", "text/plain")

        response = api_client.post(
            reverse("document-start-ocr"),
            {"file": file},
            format="multipart",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert Document.objects.count() == 0
        assert Page.objects.count() == 0

    def test_delete_document_cascades_pages_and_words(
        self, api_client, ocr_fixture_data
    ):
        document, page, word = ocr_fixture_data

        response = api_client.delete(reverse("document-detail", args=[document.id]))

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Document.objects.filter(id=document.id).exists()
        assert not Page.objects.filter(id=page.id).exists()
        assert not Word.objects.filter(id=word.id).exists()


class TestWordApi:
    def test_create_sets_page_and_word_content(self, api_client, ocr_fixture_data):
        _, page, _ = ocr_fixture_data

        response = api_client.post(
            reverse("word-list"),
            data={
                "page": page.id,
                "bbox": [[0, 0], [10, 0], [10, 10], [0, 10]],
                "direction": 1,
                "content": "created",
            },
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert Word.objects.count() == 2

        created_word = Word.objects.order_by("-id").first()
        assert created_word.page_id == page.id
        assert created_word.content == "created"

    def test_patch_updates_word_content(self, api_client, ocr_fixture_data):
        _, _, word = ocr_fixture_data
        response = api_client.patch(
            reverse("word-detail", args=[word.id]), data={"content": "next"}
        )
        assert response.status_code == status.HTTP_200_OK

        word.refresh_from_db()
        assert word.content == "next"

    def test_delete_word(self, api_client, ocr_fixture_data):
        _, _, word = ocr_fixture_data

        response = api_client.delete(reverse("word-detail", args=[word.id]))

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Word.objects.filter(id=word.id).exists()
