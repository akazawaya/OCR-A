import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from app_ocr.tests.conftest import DEFAULT_USER_EMAIL, DEFAULT_USER_PASSWORD


@pytest.fixture
def csrf_client():
    return APIClient(enforce_csrf_checks=True)


def test_login_without_csrf_token_returns_forbidden(csrf_client):
    response = csrf_client.post(
        "/api/auth/login/",
        {"email": DEFAULT_USER_EMAIL, "password": DEFAULT_USER_PASSWORD},
        format="json",
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_signup_without_csrf_token_returns_forbidden(csrf_client):
    response = csrf_client.post(
        reverse("user-list"),
        {"type": "guest"},
        format="json",
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN
