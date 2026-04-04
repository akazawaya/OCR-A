from pathlib import Path

import cv2
import numpy as np
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from app_ocr.etc.tools import inspect_file, render_page
from app_ocr.models import Document

FIXTURE_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def api_client():
    return APIClient()


def make_dummy_file(filename, content_type):
    return SimpleUploadedFile(
        filename,
        b"dummy content",
        content_type=content_type,
    )


def make_uploaded_file_from_fixture(filename, content_type):
    file_path = FIXTURE_DIR / filename
    return SimpleUploadedFile(
        name=filename,
        content=file_path.read_bytes(),
        content_type=content_type,
    )


"""
test_inspect_file
inspect_file関数をテストする。
実ファイルによるメタデータ二種の読み取りをテスト
imgとpdfに関して、inspect_file=>ext, total_pagesが正常であるかを確認

"""


@pytest.mark.parametrize(
    "filename, content_type, expected_ext, expected_total_pages",
    [
        ("sample.pdf", "application/pdf", "pdf", 10),
        ("table.jpg", "image/jpeg", "jpg", 1),
    ],
)
def test_inspect_file(
    filename,
    content_type,
    expected_ext,
    expected_total_pages,
):
    file = make_uploaded_file_from_fixture(filename, content_type)
    ext, total_pages = inspect_file(file)

    assert ext == expected_ext
    assert total_pages == expected_total_pages


"""
test_render_page
render_page の責務を実ファイルで確認する。

- decodable な PNG bytes を返す
- 呼び出し後に file pointer を先頭へ戻す
- 不正な page_number を拒否する
- 非対応 input_ext を拒否する

"""


@pytest.mark.parametrize(
    "filename, content_type, input_ext",
    [
        ("sample.pdf", "application/pdf", "pdf"),
        ("table.jpg", "image/jpeg", "jpg"),
    ],
)
def test_render_page_returns_decodable_png_bytes(
    filename,
    content_type,
    input_ext,
):
    file = make_uploaded_file_from_fixture(filename, content_type)

    img_bytes = render_page(file=file, page_number=1, input_ext=input_ext)

    assert isinstance(img_bytes, bytes)
    assert img_bytes.startswith(b"\x89PNG\r\n\x1a\n")

    decoded = cv2.imdecode(
        np.frombuffer(img_bytes, np.uint8),
        cv2.IMREAD_UNCHANGED,
    )
    assert decoded is not None
    assert decoded.shape[0] > 0
    assert decoded.shape[1] > 0


@pytest.mark.parametrize(
    "filename, content_type, input_ext",
    [
        ("sample.pdf", "application/pdf", "pdf"),
        ("table.jpg", "image/jpeg", "jpg"),
    ],
)
def test_render_page_resets_file_pointer(
    filename,
    content_type,
    input_ext,
):
    file = make_uploaded_file_from_fixture(filename, content_type)
    render_page(file=file, page_number=1, input_ext=input_ext)
    assert file.tell() == 0


def test_render_page_rejects_invalid_page_number():
    file = make_uploaded_file_from_fixture("table.jpg", "image/jpeg")

    with pytest.raises(ValueError, match="page_number must be 1-based"):
        render_page(file=file, page_number=0, input_ext="jpg")


def test_render_page_rejects_unsupported_input_ext():
    file = make_uploaded_file_from_fixture("table.jpg", "image/jpeg")

    with pytest.raises(ValueError, match="Unsupported file format"):
        render_page(file=file, page_number=1, input_ext="txt")


"""
test_start_ocr
postの確認テスト
-擬似ファイルをpostし、拡張子チェックが正常に働くことを確認
-成功は202_ACCEPTED タスクを投下するまでを責務とする
-PDFはページ数取得（実ファイル依存）があるため、inspect_fileの挙動はmockではなく実ファイルで検証する

-実ファイルをPOSTし、Document が作成されることを確認する。
-成功時は 202 ACCEPTED を返し、response で返された id の Document がDBに存在することを確認する。
"""


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


@pytest.mark.django_db
@pytest.mark.parametrize(
    "filename, content_type",
    [
        ("sample.pdf", "application/pdf"),
        ("table.jpg", "image/jpeg"),
    ],
)
def test_start_ocr_creates_document(
    api_client,
    filename,
    content_type,
):
    file = make_uploaded_file_from_fixture(filename, content_type)
    url = reverse("document-start-ocr")
    response = api_client.post(url, {"file": file}, format="multipart")
    created_document_id = response.data["document"]["id"]
    document = Document.objects.get(id=created_document_id)

    assert response.status_code == status.HTTP_202_ACCEPTED
    assert document.id == created_document_id
