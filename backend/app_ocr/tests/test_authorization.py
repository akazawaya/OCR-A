from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework import status

from app_ocr.group_policy import GROUP_POLICIES

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


def test_ocr_api_access_follows_group_policy(
    authenticated_client,
    dummy_file_factory,
    isolated_media_storage,
    monkeypatch,
):
    # Groupごとのポリシー選択はこのテストの対象外とし、全Groupを同じ値に揃えて、
    # allow_ocr_apiの変更だけで認可結果が変わることを検証する
    for policy in GROUP_POLICIES.values():
        monkeypatch.setitem(policy, "allow_ocr_api", True)

    # Document OCRとWord OCRが共通の認可処理を使う設計を前提とし、
    # ここではポリシー連動の代表としてDocument OCRのみを検証する
    with (
        patch("app_ocr.views.inspect_file", return_value=("jpg", 1)) as inspect_file,
        patch("app_ocr.views.create_pages_from_document_file"),
        patch("app_ocr.views.dispatch_ocr_pages_task.delay"),
    ):
        allowed_response = authenticated_client.post(
            reverse("document-ocr"),
            {"file": dummy_file_factory()},
            format="multipart",
        )

        for policy in GROUP_POLICIES.values():
            monkeypatch.setitem(policy, "allow_ocr_api", False)

        denied_response = authenticated_client.post(
            reverse("document-ocr"),
            {"file": dummy_file_factory()},
            format="multipart",
        )

    assert allowed_response.status_code == status.HTTP_202_ACCEPTED
    assert denied_response.status_code == status.HTTP_403_FORBIDDEN
    inspect_file.assert_called_once()
