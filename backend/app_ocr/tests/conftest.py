from pathlib import Path
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from app_ocr.models import Direction, Document, FileType, Page, UserAccount, Word

FIXTURE_DIR = Path(__file__).parent / "fixtures"
DEFAULT_UPLOAD_FILE_NAME = "sample.pdf"
DEFAULT_UPLOAD_CONTENT_TYPE = "application/pdf"
DEFAULT_PREVIEW_WORD_BBOX = [[0, 0], [10, 0], [10, 10], [0, 10]]


def _guess_fixture_from_file_name(file_name):
    suffix = Path(file_name).suffix.lower()
    if suffix in {".jpg", ".jpeg"}:
        return "table.jpg", "image/jpeg", FileType.JPG
    return DEFAULT_UPLOAD_FILE_NAME, DEFAULT_UPLOAD_CONTENT_TYPE, FileType.PDF


def _build_uploaded_file(uploaded_name, source_fixture_name, content_type):
    file_path = FIXTURE_DIR / source_fixture_name
    return SimpleUploadedFile(
        name=uploaded_name,
        content=file_path.read_bytes(),
        content_type=content_type,
    )


@pytest.fixture
def uploaded_file_factory():
    def make_uploaded_file(
        uploaded_name=DEFAULT_UPLOAD_FILE_NAME,
        source_fixture_name=DEFAULT_UPLOAD_FILE_NAME,
        content_type=DEFAULT_UPLOAD_CONTENT_TYPE,
    ):
        return _build_uploaded_file(
            uploaded_name=uploaded_name,
            source_fixture_name=source_fixture_name,
            content_type=content_type,
        )

    return make_uploaded_file


@pytest.fixture
def user_client_factory(db):
    user_model = get_user_model()

    def make_user_client(
        *,
        username=None,
        password="testpass123",
        account_kind="registered",
        ocr_access_tier=None,
        is_superuser=False,
    ):
        if is_superuser:
            user = user_model.objects.create_superuser(
                username=username or f"testuser-{uuid4().hex}",
                password=password,
            )
        else:
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
        client.user = user
        return client, user

    return make_user_client


@pytest.fixture
def authenticated_client(user_client_factory):
    client, _ = user_client_factory()
    return client


@pytest.fixture
def document_factory(db, settings, tmp_path, uploaded_file_factory):
    user_model = get_user_model()

    def make_document(
        *,
        owner=None,
        username=None,
        password="testpass123",
        file_name=DEFAULT_UPLOAD_FILE_NAME,
        file_type=None,
    ):
        settings.MEDIA_ROOT = tmp_path
        if owner is None:
            owner = user_model.objects.create_user(
                username=username or f"document-owner-{uuid4().hex}",
                password=password,
            )

        (
            source_fixture_name,
            content_type,
            default_file_type,
        ) = _guess_fixture_from_file_name(file_name)
        file_type = file_type or default_file_type

        document_kwargs = {
            "owner": owner,
            "file": uploaded_file_factory(
                uploaded_name=file_name,
                source_fixture_name=source_fixture_name,
                content_type=content_type,
            ),
            "file_name": file_name,
            "file_type": file_type,
        }

        return Document.objects.create(**document_kwargs)

    return make_document


@pytest.fixture
def page_factory(db, document_factory):
    def make_page(
        *,
        doc=None,
        owner=None,
        username=None,
        password="testpass123",
        page_number=None,
    ):
        if doc is None:
            doc = document_factory(
                owner=owner,
                username=username,
                password=password,
            )

        page_kwargs = {"doc": doc}
        if page_number is not None:
            page_kwargs["page_number"] = page_number

        return Page.objects.create(**page_kwargs)

    return make_page


@pytest.fixture
def word_factory(db, page_factory):
    def make_word(
        *,
        page=None,
        doc=None,
        owner=None,
        username=None,
        password="testpass123",
        bbox=DEFAULT_PREVIEW_WORD_BBOX,
        direction=Direction.HORIZONTAL,
        content=None,
    ):
        if page is None:
            page = page_factory(
                doc=doc,
                owner=owner,
                username=username,
                password=password,
            )

        word_kwargs = {
            "page": page,
            "bbox": bbox,
            "direction": direction,
        }
        if content is not None:
            word_kwargs["content"] = content

        return Word.objects.create(**word_kwargs)

    return make_word
