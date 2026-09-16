from unittest.mock import patch

import pytest
from django.contrib.auth.models import Group
from django.urls import reverse
from rest_framework import status

from app_ocr.backends import SingleGroupModelBackend

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


def test_document_ocr_api_access_follows_users_group(
    authenticated_client,
    uploaded_file_from_fixture_factory,
    isolated_media_storage,
):
    allowed_response = authenticated_client.post(
        reverse("document-ocr"),
        {"file": uploaded_file_from_fixture_factory()},
        format="multipart",
    )

    user = authenticated_client.user
    user.group = Group.objects.get(name="guest_group")
    user.save(update_fields=["group"])

    denied_response = authenticated_client.post(
        reverse("document-ocr"),
        {"file": uploaded_file_from_fixture_factory()},
        format="multipart",
    )

    assert allowed_response.status_code == status.HTTP_202_ACCEPTED
    assert denied_response.status_code == status.HTTP_403_FORBIDDEN


def test_word_ocr_api_access_follows_users_group(
    authenticated_client,
    document_factory,
    page_factory,
    preview_word_ocr_request_factory,
):
    document = document_factory(owner=authenticated_client.user)
    page_factory(doc=document)
    request_data = preview_word_ocr_request_factory(document=document)

    with patch("app_ocr.views.ocr_word_task.delay") as delay:
        delay.return_value.id = "preview-job-id"
        allowed_response = authenticated_client.post(
            reverse("word-ocr"),
            request_data,
            format="json",
        )

        user = authenticated_client.user
        user.group = Group.objects.get(name="guest_group")
        user.save(update_fields=["group"])

        denied_response = authenticated_client.post(
            reverse("word-ocr"),
            request_data,
            format="json",
        )

    assert allowed_response.status_code == status.HTTP_202_ACCEPTED
    assert denied_response.status_code == status.HTTP_403_FORBIDDEN
    delay.assert_called_once()


def test_with_perm_finds_users_through_single_group(user_factory):
    permitted_user = user_factory(group_name="standard_group")
    denied_user = user_factory(
        group_name="guest_group",
        email="guest@example.invalid",
    )

    users = SingleGroupModelBackend().with_perm(
        "app_ocr.run_ocr_document",
        include_superusers=False,
    )

    assert permitted_user in users
    assert denied_user not in users
