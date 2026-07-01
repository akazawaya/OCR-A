from contextlib import ExitStack
from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework import status

pytestmark = pytest.mark.django_db


def list_ids(response):
    return [item["id"] for item in response.data]


def test_authorization_limits_lists_to_own_resources(
    user_client_factory,
    document_factory,
    page_factory,
    word_factory,
):
    alice_client, _ = user_client_factory(username="alice")
    bob_client, _ = user_client_factory(username="bob")

    alice_document = document_factory(owner=alice_client.user, file_name="alice.pdf")
    bob_document = document_factory(owner=bob_client.user, file_name="bob.pdf")

    alice_page = page_factory(doc=alice_document)
    bob_page = page_factory(doc=bob_document)

    alice_word_id = word_factory(page=alice_page).id
    bob_word_id = word_factory(page=bob_page).id

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
            lambda uploaded_file_factory: {
                "file": uploaded_file_factory(
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
            lambda document, preview_word_ocr_request_factory: (
                preview_word_ocr_request_factory(
                    doc=document,
                    page_number=document.pages.first().page_number,
                )
            ),
            [
                "app_ocr.views.set_preview_word_ocr_job",
                "app_ocr.views.ocr_word_task.apply_async",
            ],
        ),
    ],
)
def test_ocr_access_tier_none_blocks_ocr(
    user_client_factory,
    document_factory,
    page_factory,
    uploaded_file_factory,
    preview_word_ocr_request_factory,
    url_name,
    payload,
    patch_targets,
):
    client, _ = user_client_factory(
        username="limited",
        ocr_access_tier="none",
    )

    document = document_factory(owner=client.user, file_name="limited.pdf")
    page_factory(doc=document)

    if url_name == "document-ocr":
        request_payload = payload(uploaded_file_factory)
    else:
        request_payload = payload(document, preview_word_ocr_request_factory)

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
