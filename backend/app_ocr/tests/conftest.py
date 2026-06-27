from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient


@pytest.fixture
def authenticated_client(db):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username=f"testuser-{uuid4().hex}",
        password="testpass123",
    )
    client = APIClient()
    client.force_login(user)
    return client
