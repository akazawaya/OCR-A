from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from app_ocr.models import UserAccount


@pytest.fixture
def user_client_factory(db):
    user_model = get_user_model()

    def make_user_client(
        *,
        username=None,
        password="testpass123",
        account_kind="registered",
        ocr_access_tier=None,
    ):
        user = user_model.objects.create_user(
            username=username or f"testuser-{uuid4().hex}",
            password=password,
        )
        profile_kwargs = {
            "user": user,
            "account_kind": account_kind,
        }
        if ocr_access_tier is not None:
            profile_kwargs["ocr_access_tier"] = ocr_access_tier
        UserAccount.objects.create(**profile_kwargs)
        client = APIClient()
        client.force_login(user)
        return client, user

    return make_user_client


@pytest.fixture
def authenticated_client(user_client_factory):
    client, _ = user_client_factory(ocr_access_tier="none")
    return client
