import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from app_ocr.tests.conftest import (
    DEFAULT_NEW_PASSWORD,
    DEFAULT_USER_EMAIL,
    DEFAULT_USER_PASSWORD,
)

pytestmark = pytest.mark.django_db

LOGIN_URL = "/api/auth/login/"
LOGOUT_URL = "/api/auth/logout/"
ME_URL = "/api/auth/me/"
PASSWORD_URL = "/api/users/me/password/"


@pytest.fixture
def api_client():
    return APIClient()


def create_user(email=DEFAULT_USER_EMAIL, password=DEFAULT_USER_PASSWORD):
    user_model = get_user_model()
    return user_model.objects.create_user(email=email, password=password)


def login_user(api_client, user, password=DEFAULT_USER_PASSWORD):
    return api_client.post(
        LOGIN_URL,
        {
            "email": user.email,
            "password": password,
        },
        format="json",
    )


def test_create_guest_user_returns_success_and_logs_in(api_client):
    guest_group = Group.objects.create(name="guest")

    response = api_client.post(
        reverse("user-list"),
        {"type": "guest"},
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    user = get_user_model().objects.get(id=response.data["id"])
    assert user.has_usable_password()
    assert list(user.groups.all()) == [guest_group]
    assert api_client.session["_auth_user_id"] == str(user.id)


def test_create_registered_user_returns_success_and_logs_in(api_client):
    email = DEFAULT_USER_EMAIL

    response = api_client.post(
        reverse("user-list"),
        {
            "type": "registered",
            "email": email,
            "password": DEFAULT_USER_PASSWORD,
        },
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    user = get_user_model().objects.get(email=email)
    assert response.data == {
        "id": user.id,
        "email": email,
    }
    assert user.check_password(DEFAULT_USER_PASSWORD)
    assert list(user.groups.all()) == []
    assert api_client.session["_auth_user_id"] == str(user.id)


def test_create_registered_user_rejects_duplicate_email(api_client):
    create_user()

    response = api_client.post(
        reverse("user-list"),
        {
            "type": "registered",
            "email": DEFAULT_USER_EMAIL,
            "password": DEFAULT_USER_PASSWORD,
        },
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert get_user_model().objects.filter(email=DEFAULT_USER_EMAIL).count() == 1
    assert "_auth_user_id" not in api_client.session


def test_login_returns_success(api_client):
    user = create_user()

    response = login_user(api_client, user)

    assert response.status_code == status.HTTP_200_OK
    assert api_client.session["_auth_user_id"] == str(user.id)


def test_me_returns_authenticated_email(api_client):
    user = create_user()

    login_response = login_user(api_client, user)
    assert login_response.status_code == status.HTTP_200_OK

    response = api_client.get(ME_URL)

    assert response.status_code == status.HTTP_200_OK
    assert response.data == {
        "authenticated": True,
        "email": user.email,
    }


def test_logout_invalidates_session(api_client):
    user = create_user()

    login_response = login_user(api_client, user)
    assert login_response.status_code == status.HTTP_200_OK
    assert api_client.session["_auth_user_id"] == str(user.id)

    logout_response = api_client.post(LOGOUT_URL, format="json")
    assert logout_response.status_code == status.HTTP_204_NO_CONTENT
    assert "_auth_user_id" not in api_client.session

    response = api_client.get(reverse("document-list"))
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_change_password_updates_password_and_keeps_session(api_client):
    user = create_user()
    login_response = login_user(api_client, user)
    assert login_response.status_code == status.HTTP_200_OK

    response = api_client.post(
        PASSWORD_URL,
        {
            "current_password": DEFAULT_USER_PASSWORD,
            "new_password": DEFAULT_NEW_PASSWORD,
            "new_password_confirmation": DEFAULT_NEW_PASSWORD,
        },
        format="json",
    )

    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert api_client.session["_auth_user_id"] == str(user.id)

    api_client.post(LOGOUT_URL, format="json")

    login_response = api_client.post(
        LOGIN_URL,
        {
            "email": user.email,
            "password": DEFAULT_NEW_PASSWORD,
        },
        format="json",
    )
    assert login_response.status_code == status.HTTP_200_OK


def test_change_password_rejects_wrong_current_password(api_client):
    user = create_user()
    login_response = login_user(api_client, user)
    assert login_response.status_code == status.HTTP_200_OK

    response = api_client.post(
        PASSWORD_URL,
        {
            "current_password": "wrong-password",
            "new_password": DEFAULT_NEW_PASSWORD,
            "new_password_confirmation": DEFAULT_NEW_PASSWORD,
        },
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "current_password" in response.data
    assert user.check_password(DEFAULT_USER_PASSWORD)


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
