import pytest
from django.contrib.auth.models import Permission
from django.urls import reverse
from rest_framework import status

pytestmark = pytest.mark.django_db


def list_ids(data):
    return [item["id"] for item in data]


def test_authorization_limits_lists_to_own_resources(
    user_client_factory,
    document_factory,
    page_factory,
    word_factory,
):
    alice_client, _ = user_client_factory(
        group_name="standard_group",
        email="alice@example.invalid",
    )
    bob_client, _ = user_client_factory(
        group_name="standard_group",
        email="bob@example.invalid",
    )

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

    assert list_ids(alice_documents.data["results"]) == [alice_document.id]
    assert list_ids(bob_documents.data["results"]) == [bob_document.id]
    assert set(list_ids(alice_pages.data)) == {alice_page.id}
    assert set(list_ids(bob_pages.data)) == {bob_page.id}
    assert list_ids(alice_words.data) == [alice_word_id]
    assert list_ids(bob_words.data) == [bob_word_id]


def test_document_ocr_api_access_follows_group_permission(
    authenticated_client,
    uploaded_file_from_fixture_factory,
    isolated_media_storage,
):
    ocr_permission = Permission.objects.get(
        content_type__app_label="app_ocr",
        content_type__model="document",
        codename="run_ocr_document",
    )
    group = authenticated_client.user.group

    # Document OCRとWord OCRが共通の認可処理を使う設計を前提とし、
    # ここではPermission連動の代表としてDocument OCRのみを検証する
    # standard_groupの初期OCR Permissionを外すだけで認可結果が変わることを検証する
    allowed_response = authenticated_client.post(
        reverse("document-ocr"),
        {"file": uploaded_file_from_fixture_factory()},
        format="multipart",
    )

    group.permissions.remove(ocr_permission)

    denied_response = authenticated_client.post(
        reverse("document-ocr"),
        {"file": uploaded_file_from_fixture_factory()},
        format="multipart",
    )

    assert allowed_response.status_code == status.HTTP_202_ACCEPTED
    assert denied_response.status_code == status.HTTP_403_FORBIDDEN
