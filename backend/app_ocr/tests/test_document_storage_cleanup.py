import pytest
from django.contrib.admin.helpers import ACTION_CHECKBOX_NAME
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status

from app_ocr.models import Document, Page, Word

pytestmark = pytest.mark.django_db

# Documentに紐づく保存ファイルを削除する運用ルートと実装の対応
#
# Admin:
# - User一括削除
#   -> 1. UserQuerySet.delete()でDocumentの保存ファイルを削除
#   -> super().delete()のCASCADEでDocument・Page・WordをDBから削除
# - Document一括削除
#   -> 2. DocumentQuerySet.delete()でDocumentの保存ファイルを削除
#   -> super().delete()でDocument・Page・WordをDBから削除
#
# ユーザー操作:
# - Document削除API
#   -> 3. Document.delete()で保存ファイルとDBレコードを削除
# - UserのDELETE me API
#   -> 1. User.delete()でDocumentの保存ファイルを削除
#   -> super().delete()のCASCADEでDocument・Page・WordをDBから削除
#
# ファイル削除は既存のdelete_document_files()へ集約し、Document.fileと同じ
# 保存prefix配下のPage.imageもまとめて削除する。


def test_document_delete_api_deletes_stored_file(
    user_client_factory,
    document_factory,
):
    client, user = user_client_factory(group_name="staff_group")
    document = document_factory(owner=user)
    document_id = document.id
    file_name = document.file.name
    storage = document.file.storage

    response = client.delete(reverse("document-detail", args=[document_id]))

    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert not Document.objects.filter(id=document_id).exists()
    assert not storage.exists(file_name)


def test_user_delete_me_api_deletes_owned_document_files(
    user_client_factory,
    document_factory,
    page_factory,
    word_factory,
    dummy_file_factory,
):
    client, user = user_client_factory(group_name="standard_group")
    user_id = user.id
    document = document_factory(owner=user)
    page = page_factory(doc=document)
    page.image.save(
        "page.png",
        dummy_file_factory(filename="page.png", content_type="image/png"),
        save=True,
    )
    word_factory(page=page)
    document_id = document.id
    document_file_name = document.file.name
    document_storage = document.file.storage
    page_image_name = page.image.name
    page_storage = page.image.storage

    response = client.delete(reverse("user-me"))

    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert not get_user_model().objects.filter(id=user_id).exists()
    assert not Document.objects.filter(id=document_id).exists()
    assert not Page.objects.filter(doc_id=document_id).exists()
    assert not Word.objects.filter(page_id=page.id).exists()
    assert not document_storage.exists(document_file_name)
    assert not page_storage.exists(page_image_name)


def test_document_admin_bulk_delete_deletes_stored_file(
    user_client_factory,
    document_factory,
):
    client, user = user_client_factory(
        group_name="staff_group",
        email="admin@example.invalid",
    )
    document = document_factory(owner=user)
    document_id = document.id
    file_name = document.file.name
    storage = document.file.storage
    url = reverse("admin:app_ocr_document_changelist")
    data = {
        "action": "delete_selected",
        ACTION_CHECKBOX_NAME: [document_id],
    }

    confirmation_response = client.post(url, data)

    assert confirmation_response.status_code == status.HTTP_200_OK
    assert Document.objects.filter(id=document_id).exists()
    assert storage.exists(file_name)

    response = client.post(url, {**data, "post": "yes"})

    assert response.status_code == status.HTTP_302_FOUND
    assert not Document.objects.filter(id=document_id).exists()
    assert not storage.exists(file_name)


def test_user_admin_bulk_delete_deletes_owned_document_files(
    user_client_factory,
    document_factory,
):
    client, _ = user_client_factory(
        group_name="staff_group",
        email="admin@example.invalid",
    )
    user_model = get_user_model()
    target_user = user_model.objects.create_user(email="target@example.invalid")
    document = document_factory(owner=target_user)
    target_user_id = target_user.id
    document_id = document.id
    file_name = document.file.name
    storage = document.file.storage
    url = reverse("admin:app_ocr_user_changelist")
    data = {
        "action": "delete_selected",
        ACTION_CHECKBOX_NAME: [target_user_id],
    }

    confirmation_response = client.post(url, data)

    assert confirmation_response.status_code == status.HTTP_200_OK
    assert user_model.objects.filter(id=target_user_id).exists()
    assert Document.objects.filter(id=document_id).exists()
    assert storage.exists(file_name)

    response = client.post(url, {**data, "post": "yes"})

    assert response.status_code == status.HTTP_302_FOUND
    assert not user_model.objects.filter(id=target_user_id).exists()
    assert not Document.objects.filter(id=document_id).exists()
    assert not storage.exists(file_name)
