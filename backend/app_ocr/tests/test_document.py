from rest_framework import status
from rest_framework.test import APIClient
from django.urls import reverse
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile


@pytest.fixture
def api_client():
    return APIClient()


def make_dummy_file(filename, content_type):
    return SimpleUploadedFile(
        filename,
        b"dummy content",
        content_type=content_type,
    )


@pytest.mark.parametrize(
    "filename, content_type, expected_status",
    [
        ("test.jpg", "image/jpeg", status.HTTP_202_ACCEPTED),
        ("test.png", "image/png", status.HTTP_202_ACCEPTED),
        ("test.txt", "text/plain", status.HTTP_400_BAD_REQUEST),
        ("test.tiff", "image/tiff", status.HTTP_400_BAD_REQUEST),
        ("test.bmp", "image/bmp", status.HTTP_400_BAD_REQUEST),
    ],
)
@pytest.mark.django_db
def test_start_ocr_validates_file_extension(
    api_client,
    filename,
    content_type,
    expected_status,
):
    file = make_dummy_file(filename, content_type)
    url = reverse("document-start-ocr")
    payload = {"file": file}
    response = api_client.post(url, payload, format="multipart")

    assert response.status_code == expected_status
