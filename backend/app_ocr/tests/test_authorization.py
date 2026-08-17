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
    alice_client, _ = user_client_factory(email="alice@example.invalid")
    bob_client, _ = user_client_factory(email="bob@example.invalid")

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
    (
        "url_name,payload,patch_targets,email,is_superuser,"
        "group_permissions,expected_status,inspect_file_return"
    ),
    [
        (
            "document-ocr",
            lambda dummy_file_factory: {"file": dummy_file_factory()},
            [
                "app_ocr.views.inspect_file",
                "app_ocr.views.create_pages_from_document_file",
                "app_ocr.views.dispatch_ocr_pages_task.delay",
            ],
            "without-document-permission",
            False,
            (),
            status.HTTP_403_FORBIDDEN,
            None,
        ),
        (
            "word-ocr",
            None,
            [
                "app_ocr.views.ocr_word_task.apply_async",
            ],
            "without-word-permission",
            False,
            (),
            status.HTTP_403_FORBIDDEN,
            None,
        ),
        (
            "document-ocr",
            lambda dummy_file_factory: {"file": dummy_file_factory()},
            [
                "app_ocr.views.inspect_file",
                "app_ocr.views.create_pages_from_document_file",
                "app_ocr.views.dispatch_ocr_pages_task.delay",
            ],
            "with-document-permission",
            False,
            ("add_document",),
            status.HTTP_202_ACCEPTED,
            ("jpg", 1),
        ),
        (
            "word-ocr",
            None,
            [
                "app_ocr.views.ocr_word_task.apply_async",
            ],
            "with-word-permission",
            False,
            ("add_word",),
            status.HTTP_202_ACCEPTED,
            None,
        ),
        (
            "document-ocr",
            lambda dummy_file_factory: {"file": dummy_file_factory()},
            [
                "app_ocr.views.inspect_file",
                "app_ocr.views.create_pages_from_document_file",
                "app_ocr.views.dispatch_ocr_pages_task.delay",
            ],
            "document-admin",
            True,
            (),
            status.HTTP_202_ACCEPTED,
            ("jpg", 1),
        ),
        (
            "word-ocr",
            None,
            [
                "app_ocr.views.ocr_word_task.apply_async",
            ],
            "word-admin",
            True,
            (),
            status.HTTP_202_ACCEPTED,
            None,
        ),
    ],
)
def test_group_model_permissions_control_ocr_access(
    user_client_factory,
    group_factory,
    document_factory,
    page_factory,
    dummy_file_factory,
    preview_word_ocr_request_factory,
    settings,
    tmp_path,
    url_name,
    payload,
    patch_targets,
    email,
    is_superuser,
    group_permissions,
    expected_status,
    inspect_file_return,
):
    groups = []
    if group_permissions:
        groups = [
            group_factory(
                name=f"{email}-group",
                permissions=group_permissions,
            )
        ]
    client, _ = user_client_factory(
        email=email,
        is_superuser=is_superuser,
        groups=groups,
    )
    settings.MEDIA_ROOT = tmp_path

    document = None
    if url_name == "word-ocr":
        document = document_factory(owner=client.user, file_name="limited.pdf")
        page_factory(doc=document)

    if url_name == "document-ocr":
        request_payload = payload(dummy_file_factory)
    else:
        request_payload = preview_word_ocr_request_factory(document=document)

    with ExitStack() as stack:
        mocks = []
        for target in patch_targets:
            if (
                target == "app_ocr.views.inspect_file"
                and inspect_file_return is not None
            ):
                mocks.append(
                    stack.enter_context(patch(target, return_value=inspect_file_return))
                )
            else:
                mock = stack.enter_context(patch(target))
                if target == "app_ocr.views.ocr_word_task.apply_async":
                    mock.return_value.id = "preview-job-1"
                mocks.append(mock)
        response = client.post(
            reverse(url_name),
            request_payload,
            format="multipart" if url_name == "document-ocr" else "json",
        )

    assert response.status_code == expected_status
    if expected_status == status.HTTP_403_FORBIDDEN:
        for mock in mocks:
            mock.assert_not_called()
    elif url_name == "document-ocr":
        mocks[0].assert_called_once()
        for mock in mocks[1:]:
            mock.assert_not_called()
    else:
        for mock in mocks:
            mock.assert_called_once()
