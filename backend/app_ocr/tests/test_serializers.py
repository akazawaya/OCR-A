import pytest
from django.contrib.auth import get_user_model

from app_ocr.input_constraints import MAX_UPLOAD_FILE_SIZE
from app_ocr.serializers import (
    DocumentUploadSerializer,
    UserCreateSerializer,
)
from app_ocr.tests.conftest import DEFAULT_EMAIL, DEFAULT_PASSWORD


class TestUserCreateSerializer:
    @pytest.mark.django_db
    def test_rejects_duplicate_email(self):
        get_user_model().objects.create_user(
            email=DEFAULT_EMAIL,
            password=DEFAULT_PASSWORD,
        )

        serializer = UserCreateSerializer(
            data={
                "type": "registered",
                "email": DEFAULT_EMAIL,
                "password": DEFAULT_PASSWORD,
            }
        )

        assert not serializer.is_valid()
        assert str(serializer.errors["email"][0]) == (
            "このメールアドレスは既に使われています。"
        )


class TestDocumentUploadSerializer:
    @pytest.mark.parametrize(
        "filename, content_type",
        [
            ("test.jpg", "image/jpeg"),
            ("test.jpeg", "image/jpeg"),
            ("test.png", "image/png"),
            ("test.pdf", "application/pdf"),
        ],
    )
    def test_accepts_supported_extension(
        self, dummy_file_factory, filename, content_type
    ):
        serializer = DocumentUploadSerializer(
            data={"file": dummy_file_factory(filename, content_type)}
        )

        assert serializer.is_valid()

    @pytest.mark.parametrize(
        "filename, content_type",
        [
            ("test.txt", "text/plain"),
            ("test.tiff", "image/tiff"),
            ("test.bmp", "image/bmp"),
        ],
    )
    def test_rejects_unsupported_extension(
        self, dummy_file_factory, filename, content_type
    ):
        serializer = DocumentUploadSerializer(
            data={"file": dummy_file_factory(filename, content_type)}
        )

        assert not serializer.is_valid()
        assert str(serializer.errors["file"][0]) == "拡張子が非対応です。"
        assert serializer.errors["file"][0].code == "unsupported_extension"

    def test_rejects_too_large_file(self, dummy_file_factory):
        file = dummy_file_factory(
            content=b"a" * (MAX_UPLOAD_FILE_SIZE + 1),
        )

        serializer = DocumentUploadSerializer(data={"file": file})

        assert not serializer.is_valid()
        assert str(serializer.errors["file"][0]) == "ファイルサイズが大きすぎます。"
        assert serializer.errors["file"][0].code == "file_too_large"

    def test_rejects_too_long_file_name(self, dummy_file_factory):
        file = dummy_file_factory(f"{'a' * 101}.jpg")
        serializer = DocumentUploadSerializer(data={"file": file})

        assert not serializer.is_valid()
        assert str(serializer.errors["file"][0]) == "ファイル名が長すぎます。"
        assert serializer.errors["file"][0].code == "file_name_too_long"
