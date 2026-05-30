import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from app_ocr.input_constraints import MAX_UPLOAD_FILE_SIZE
from app_ocr.serializers import DocumentUploadSerializer


def make_dummy_file(filename, content_type, content=b"dummy content"):
    return SimpleUploadedFile(
        filename,
        content,
        content_type=content_type,
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
    def test_accepts_supported_extension(self, filename, content_type):
        serializer = DocumentUploadSerializer(
            data={"file": make_dummy_file(filename, content_type)}
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
    def test_rejects_unsupported_extension(self, filename, content_type):
        serializer = DocumentUploadSerializer(
            data={"file": make_dummy_file(filename, content_type)}
        )

        assert not serializer.is_valid()
        assert str(serializer.errors["file"][0]) == "拡張子が非対応です。"
        assert serializer.errors["file"][0].code == "unsupported_extension"

    def test_rejects_too_large_file(self):
        file = make_dummy_file(
            "too_large.jpg",
            "image/jpeg",
            content=b"a" * (MAX_UPLOAD_FILE_SIZE + 1),
        )

        serializer = DocumentUploadSerializer(data={"file": file})

        assert not serializer.is_valid()
        assert str(serializer.errors["file"][0]) == "ファイルサイズが大きすぎます。"
        assert serializer.errors["file"][0].code == "file_too_large"

    def test_rejects_too_long_file_name(self):
        file = make_dummy_file(f"{'a' * 101}.jpg", "image/jpeg")
        serializer = DocumentUploadSerializer(data={"file": file})

        assert not serializer.is_valid()
        assert str(serializer.errors["file"][0]) == "ファイル名が長すぎます。"
        assert serializer.errors["file"][0].code == "file_name_too_long"
