import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from app_ocr.tests.conftest import DEFAULT_PASSWORD

pytestmark = pytest.mark.django_db

LOGIN_URL = "/api/auth/login/"
LOGOUT_URL = "/api/auth/logout/"
ME_URL = "/api/auth/me/"


@pytest.fixture
def api_client():
    return APIClient()


def create_user(username="alice", password=DEFAULT_PASSWORD):
    user_model = get_user_model()
    return user_model.objects.create_user(username=username, password=password)


def login_user(api_client, user, password=DEFAULT_PASSWORD):
    return api_client.post(
        LOGIN_URL,
        {
            "username": user.username,
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
    username = "registered-user"

    response = api_client.post(
        reverse("user-list"),
        {
            "type": "registered",
            "username": username,
            "password": DEFAULT_PASSWORD,
        },
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    user = get_user_model().objects.get(username=username)
    assert response.data == {
        "id": user.id,
        "username": username,
    }
    assert user.check_password(DEFAULT_PASSWORD)
    assert list(user.groups.all()) == []
    assert api_client.session["_auth_user_id"] == str(user.id)


def test_create_registered_user_rejects_duplicate_username(api_client):
    create_user(username="registered-user")

    response = api_client.post(
        reverse("user-list"),
        {
            "type": "registered",
            "username": "registered-user",
            "password": DEFAULT_PASSWORD,
        },
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert get_user_model().objects.filter(username="registered-user").count() == 1
    assert "_auth_user_id" not in api_client.session


def test_login_returns_success(api_client):
    user = create_user()

    response = login_user(api_client, user)

    assert response.status_code == status.HTTP_200_OK
    assert api_client.session["_auth_user_id"] == str(user.id)


def test_me_returns_authenticated_username(api_client):
    user = create_user()

    login_response = login_user(api_client, user)
    assert login_response.status_code == status.HTTP_200_OK

    response = api_client.get(ME_URL)

    assert response.status_code == status.HTTP_200_OK
    assert response.data == {
        "authenticated": True,
        "username": user.username,
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
