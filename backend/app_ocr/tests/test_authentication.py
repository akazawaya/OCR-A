import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db

LOGIN_URL = "/api/auth/login/"
LOGOUT_URL = "/api/auth/logout/"
ME_URL = "/api/auth/me/"


@pytest.fixture
def api_client():
    return APIClient()


def create_user(username="alice", password="password1234"):
    user_model = get_user_model()
    return user_model.objects.create_user(username=username, password=password)


def test_login_returns_success(api_client):
    user = create_user()

    response = api_client.post(
        LOGIN_URL,
        {
            "username": user.username,
            "password": "password1234",
        },
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK
    assert api_client.session["_auth_user_id"] == str(user.id)


def test_me_returns_authenticated_username(api_client):
    user = create_user()

    login_response = api_client.post(
        LOGIN_URL,
        {
            "username": user.username,
            "password": "password1234",
        },
        format="json",
    )
    assert login_response.status_code == status.HTTP_200_OK

    response = api_client.get(ME_URL)

    assert response.status_code == status.HTTP_200_OK
    assert response.data == {
        "authenticated": True,
        "username": user.username,
    }


def test_logout_invalidates_session(api_client):
    user = create_user()

    login_response = api_client.post(
        LOGIN_URL,
        {
            "username": user.username,
            "password": "password1234",
        },
        format="json",
    )
    assert login_response.status_code == status.HTTP_200_OK
    assert api_client.session["_auth_user_id"] == str(user.id)

    logout_response = api_client.post(LOGOUT_URL, format="json")
    assert logout_response.status_code == status.HTTP_200_OK
    assert "_auth_user_id" not in api_client.session

    response = api_client.get(reverse("document-list"))
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.parametrize(
    "method,url_name,payload_kind,format_,patch_target",
    [
        ("get", "document-list", None, None, None),
        ("post", "document-list", "document_upload", "multipart", None),
        (
            "post",
            "document-ocr",
            "document_upload",
            "multipart",
            "app_ocr.views.dispatch_ocr_pages_task.delay",
        ),
        (
            "post",
            "word-ocr",
            "preview_word_ocr",
            "json",
            "app_ocr.views.ocr_word_task.apply_async",
        ),
    ],
)
def test_anonymous_cannot_access_protected_api(
    preview_word_ocr_request_factory,
    api_client,
    dummy_file_factory,
    method,
    url_name,
    payload_kind,
    format_,
    patch_target,
    settings,
    tmp_path,
):
    settings.MEDIA_ROOT = tmp_path

    if payload_kind == "document_upload":
        payload = {"file": dummy_file_factory()}
    elif payload_kind == "preview_word_ocr":
        payload = preview_word_ocr_request_factory()
    else:
        payload = None

    if patch_target is not None:
        from unittest.mock import patch

        context = patch(patch_target)
    else:
        context = None

    request = getattr(api_client, method)
    url = reverse(url_name)

    if context is None:
        response = (
            request(url) if payload is None else request(url, payload, format=format_)
        )
    else:
        with context:
            response = (
                request(url)
                if payload is None
                else request(url, payload, format=format_)
            )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    # permission 拒否時に401か403かは、そのview(documentとword)に適用される
    # authentication classes の挙動で決まる。
    # authentication_classes を明示していない時は、
    # DRF の DEFAULT_AUTHENTICATION_CLASSES が使われる。
    # それも未設定なら既定は SessionAuthentication -> BasicAuthentication。
    # 今回はSessionAuthentication により403が返る。
