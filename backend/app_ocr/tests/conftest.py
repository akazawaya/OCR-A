from pathlib import Path

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from app_ocr.models import Direction, Document, FileType, Page, Word

FIXTURE_DIR = Path(__file__).parent / "fixtures"
DEFAULT_UPLOAD_FILE_NAME = "sample.pdf"
DEFAULT_UPLOAD_CONTENT_TYPE = "application/pdf"
DEFAULT_UPLOAD_FILE_TYPE = FileType.PDF
DEFAULT_PREVIEW_WORD_BBOX = [[0, 0], [10, 0], [10, 10], [0, 10]]
DEFAULT_PREVIEW_WORD_OCR_MODE = "rewrite_content"
DEFAULT_DOCUMENT_ID = 1
DEFAULT_PAGE_NUMBER = 1
DEFAULT_EMAIL = "testuser@example.invalid"
DEFAULT_PASSWORD = "testpass123"
DEFAULT_NEW_PASSWORD = "new-testpass123"
DEFAULT_WORD_DIRECTION = Direction.HORIZONTAL
DEFAULT_WORD_CONTENT = "test"


@pytest.fixture
def dummy_file_factory():
    def make_dummy_file(
        filename=DEFAULT_UPLOAD_FILE_NAME,
        content_type=DEFAULT_UPLOAD_CONTENT_TYPE,
        content=b"dummy content",
    ):
        return SimpleUploadedFile(filename, content, content_type=content_type)

    return make_dummy_file


@pytest.fixture
def uploaded_file_from_fixture_factory():
    def make_uploaded_file_from_fixture(
        filename=DEFAULT_UPLOAD_FILE_NAME, content_type=DEFAULT_UPLOAD_CONTENT_TYPE
    ):
        file_path = FIXTURE_DIR / filename
        return SimpleUploadedFile(
            name=filename,
            content=file_path.read_bytes(),
            content_type=content_type,
        )

    return make_uploaded_file_from_fixture


@pytest.fixture
def group_factory(db):
    def make_group(*, name="test-group", permissions=()):
        group = Group.objects.create(name=name)
        if permissions:
            group.permissions.add(
                *Permission.objects.filter(
                    content_type__app_label="app_ocr",
                    codename__in=permissions,
                )
            )
        return group

    return make_group


@pytest.fixture
def user_client_factory(db):
    user_model = get_user_model()

    def make_user_client(
        *,
        email=DEFAULT_EMAIL,
        password=DEFAULT_PASSWORD,
        is_superuser=False,
        groups=(),
    ):
        if is_superuser:
            user = user_model.objects.create_superuser(
                email=email,
                password=password,
            )
        else:
            user = user_model.objects.create_user(
                email=email,
                password=password,
            )
            if groups:
                user.groups.add(*groups)
        client = APIClient()
        client.force_login(user)
        client.user = user
        return client, user

    return make_user_client


@pytest.fixture
def authenticated_client(user_client_factory, group_factory):
    ocr_group = group_factory(
        name="ocr-users",
        permissions=("add_document", "add_word"),
    )
    client, _ = user_client_factory(groups=[ocr_group])
    return client


@pytest.fixture
def document_factory(db, settings, tmp_path, dummy_file_factory):
    user_model = get_user_model()

    def make_document(
        *,
        owner=None,
        email=DEFAULT_EMAIL,
        password=DEFAULT_PASSWORD,
        file_name=DEFAULT_UPLOAD_FILE_NAME,
        file_type=DEFAULT_UPLOAD_FILE_TYPE,
        file=None,
    ):
        settings.MEDIA_ROOT = tmp_path

        if owner is None:
            owner = user_model.objects.create_user(
                email=email,
                password=password,
            )

        upload_file = file or dummy_file_factory(
            filename=file_name,
            content_type=DEFAULT_UPLOAD_CONTENT_TYPE,
        )

        document = Document.objects.create(
            owner=owner,
            file_name=file_name,
            file_type=file_type,
        )
        # 本番のDocumentSerializerと同様、ID確定後にファイルを保存する。
        document.file.save(upload_file.name, upload_file, save=True)
        return document

    return make_document


@pytest.fixture
def page_factory(db, document_factory):
    def make_page(
        *,
        doc=None,
        owner=None,
        email=DEFAULT_EMAIL,
        password=DEFAULT_PASSWORD,
        page_number=DEFAULT_PAGE_NUMBER,
    ):
        if doc is None:
            doc = document_factory(
                owner=owner,
                email=email,
                password=password,
            )

        return Page.objects.create(doc=doc, page_number=page_number)

    return make_page


@pytest.fixture
def word_factory(db, page_factory):
    def make_word(
        *,
        page=None,
        doc=None,
        owner=None,
        email=DEFAULT_EMAIL,
        password=DEFAULT_PASSWORD,
        bbox=DEFAULT_PREVIEW_WORD_BBOX,
        direction=DEFAULT_WORD_DIRECTION,
        content=DEFAULT_WORD_CONTENT,
    ):
        if page is None:
            page = page_factory(
                doc=doc,
                owner=owner,
                email=email,
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


@pytest.fixture
def preview_word_ocr_request_factory():
    def make_preview_word_ocr_request(
        *,
        mode=DEFAULT_PREVIEW_WORD_OCR_MODE,
        document=None,
        doc=None,
        page_number=DEFAULT_PAGE_NUMBER,
        preview_id="preview:test",
        bbox=DEFAULT_PREVIEW_WORD_BBOX,
    ):
        if document is not None:
            doc = document.id
            page_number = document.pages.first().page_number

        return {
            "mode": mode,
            "preview_id": preview_id,
            "doc": doc,
            "page_number": page_number,
            "bbox": bbox,
        }

    return make_preview_word_ocr_request
