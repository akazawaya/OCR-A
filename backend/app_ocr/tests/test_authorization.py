from contextlib import ExitStack
from pathlib import Path
from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status

from app_ocr.models import Direction, Document

FIXTURE_DIR = Path(__file__).parent / "fixtures"

pytestmark = pytest.mark.django_db


def make_uploaded_file(uploaded_name, source_fixture_name, content_type):
    file_path = FIXTURE_DIR / source_fixture_name
    return SimpleUploadedFile(
        name=uploaded_name,
        content=file_path.read_bytes(),
        content_type=content_type,
    )


def create_document(client, *, uploaded_name, source_fixture_name, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    with patch("app_ocr.views.notify_document_changed"):
        response = client.post(
            reverse("document-list"),
            {
                "file": make_uploaded_file(
                    uploaded_name,
                    source_fixture_name,
                    "image/jpeg",
                )
            },
            format="multipart",
        )

    assert response.status_code == status.HTTP_201_CREATED
    return Document.objects.get(id=response.data["id"])


def create_word(client, *, page_id, content):
    response = client.post(
        reverse("word-list"),
        {
            "page": page_id,
            "bbox": [[0, 0], [10, 0], [10, 10], [0, 10]],
            "content": content,
            "direction": Direction.HORIZONTAL,
        },
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    return response.data["id"]


def list_ids(response):
    return [item["id"] for item in response.data]


def test_authorization_limits_lists_to_own_resources(
    settings,
    tmp_path,
    user_client_factory,
):
    alice_client, _ = user_client_factory(username="alice")
    bob_client, _ = user_client_factory(username="bob")

    alice_document = create_document(
        alice_client,
        uploaded_name="alice.jpg",
        source_fixture_name="table.jpg",
        settings=settings,
        tmp_path=tmp_path,
    )
    bob_document = create_document(
        bob_client,
        uploaded_name="bob.jpg",
        source_fixture_name="table.jpg",
        settings=settings,
        tmp_path=tmp_path,
    )

    alice_page = alice_document.pages.first()
    bob_page = bob_document.pages.first()

    alice_word_id = create_word(
        alice_client,
        page_id=alice_page.id,
        content="alice word",
    )
    bob_word_id = create_word(
        bob_client,
        page_id=bob_page.id,
        content="bob word",
    )

    alice_documents = alice_client.get(reverse("document-list"))
    alice_pages = alice_client.get(reverse("page-list"))
    alice_words = alice_client.get(reverse("word-list"))

    bob_documents = bob_client.get(reverse("document-list"))
    bob_pages = bob_client.get(reverse("page-list"))
    bob_words = bob_client.get(reverse("word-list"))

    assert alice_documents.status_code == status.HTTP_200_OK
    assert alice_pages.status_code == status.HTTP_200_OK
    assert alice_words.status_code == status.HTTP_200_OK
    assert bob_documents.status_code == status.HTTP_200_OK
    assert bob_pages.status_code == status.HTTP_200_OK
    assert bob_words.status_code == status.HTTP_200_OK

    assert list_ids(alice_documents) == [alice_document.id]
    assert list_ids(bob_documents) == [bob_document.id]
    assert set(list_ids(alice_pages)) == {alice_page.id}
    assert set(list_ids(bob_pages)) == {bob_page.id}
    assert list_ids(alice_words) == [alice_word_id]
    assert list_ids(bob_words) == [bob_word_id]


@pytest.mark.parametrize(
    "url_name,payload,patch_targets",
    [
        (
            "document-ocr",
            lambda: {
                "file": make_uploaded_file(
                    "guest-ocr.jpg",
                    "table.jpg",
                    "image/jpeg",
                )
            },
            [
                "app_ocr.views.inspect_file",
                "app_ocr.views.create_pages_from_document_file",
                "app_ocr.views.dispatch_ocr_pages_task.delay",
            ],
        ),
        (
            "word-ocr",
            lambda document: {
                "mode": "rewrite_content",
                "preview_id": "preview:test",
                "doc": document.id,
                "page_number": document.pages.first().page_number,
                "bbox": [[0, 0], [10, 0], [10, 10], [0, 10]],
            },
            [
                "app_ocr.views.set_preview_word_ocr_job",
                "app_ocr.views.ocr_word_task.apply_async",
            ],
        ),
    ],
)
def test_ocr_access_tier_none_blocks_ocr(
    settings,
    tmp_path,
    user_client_factory,
    url_name,
    payload,
    patch_targets,
):
    client, _ = user_client_factory(
        username="limited",
        ocr_access_tier="none",
    )
    settings.MEDIA_ROOT = tmp_path

    document = create_document(
        client,
        uploaded_name="limited.jpg",
        source_fixture_name="table.jpg",
        settings=settings,
        tmp_path=tmp_path,
    )

    if url_name == "document-ocr":
        request_payload = payload()
    else:
        request_payload = payload(document)

    with ExitStack() as stack:
        mocks = [stack.enter_context(patch(target)) for target in patch_targets]
        response = client.post(
            reverse(url_name),
            request_payload,
            format="multipart" if url_name == "document-ocr" else "json",
        )

    assert response.status_code == status.HTTP_403_FORBIDDEN
    for mock in mocks:
        mock.assert_not_called()
