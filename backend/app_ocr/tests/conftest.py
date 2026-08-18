from datetime import UTC, datetime
from pathlib import Path

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from app_ocr.models import Direction, Document, FileType, Page, State, Word

FIXTURE_DIR = Path(__file__).parent / "fixtures"
GENERATE_DEFAULT = object()  # 他の値と一致しない固有オブジェクトで仮置き

# Userモデルのデフォルト値
DEFAULT_USER_EMAIL = "testuser@example.invalid"
DEFAULT_USER_PASSWORD = "testpass123"
DEFAULT_USER_LAST_LOGIN = datetime(2026, 1, 1, tzinfo=UTC)
DEFAULT_USER_IS_SUPERUSER = False
DEFAULT_USER_IS_STAFF = False
DEFAULT_USER_GROUPS = ()
DEFAULT_USER_PERMISSIONS = ()

# Documentモデルのデフォルト値
DEFAULT_DOCUMENT_OWNER = GENERATE_DEFAULT
DEFAULT_DOCUMENT_STATE = State.QUEUED
DEFAULT_DOCUMENT_FILE = GENERATE_DEFAULT
DEFAULT_DOCUMENT_FILE_NAME = "sample.pdf"
DEFAULT_DOCUMENT_FILE_TYPE = FileType.PDF
DEFAULT_DOCUMENT_TOTAL_PAGES = 1

# Pageモデルのデフォルト値
DEFAULT_PAGE_DOCUMENT = GENERATE_DEFAULT
DEFAULT_PAGE_IMAGE = "test.png"
DEFAULT_PAGE_STATE = State.QUEUED
DEFAULT_PAGE_NUMBER = 1
DEFAULT_PAGE_WIDTH_PX = 1600
DEFAULT_PAGE_HEIGHT_PX = 800

# Wordモデルのデフォルト値
DEFAULT_WORD_PAGE = GENERATE_DEFAULT
DEFAULT_WORD_BBOX = [[0, 0], [10, 0], [10, 10], [0, 10]]
DEFAULT_WORD_CONTENT = "test"
DEFAULT_WORD_DIRECTION = Direction.HORIZONTAL
DEFAULT_WORD_REC_SCORE = 0.90
DEFAULT_WORD_DET_SCORE = 0.90

# APIリクエスト用のデフォルト値
DEFAULT_NEW_PASSWORD = "new-testpass123"
DEFAULT_PREVIEW_WORD_OCR_MODE = "rewrite_content"
DEFAULT_PREVIEW_DOCUMENT_ID = 1
DEFAULT_PREVIEW_ID = "preview:test"

# 各モデルのidとDocument.createdはDBが生成するため、factoryの入力値には含めない。


@pytest.fixture
def dummy_file_factory():
    def make_dummy_file(
        filename=DEFAULT_DOCUMENT_FILE_NAME,
        content_type="application/pdf",
        content=b"dummy content",
    ):
        return SimpleUploadedFile(filename, content, content_type=content_type)

    return make_dummy_file


@pytest.fixture
def uploaded_file_from_fixture_factory():
    def make_uploaded_file_from_fixture(
        filename=DEFAULT_DOCUMENT_FILE_NAME,
        content_type="application/pdf",
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
def user_factory(db):
    user_model = get_user_model()

    def make_user(
        *,
        email=DEFAULT_USER_EMAIL,
        password=DEFAULT_USER_PASSWORD,
        last_login=DEFAULT_USER_LAST_LOGIN,
        is_superuser=DEFAULT_USER_IS_SUPERUSER,
        is_staff=DEFAULT_USER_IS_STAFF,
        groups=DEFAULT_USER_GROUPS,
        permissions=DEFAULT_USER_PERMISSIONS,
    ):
        user = user_model.objects.create_user(
            email=email,
            password=password,
            last_login=last_login,
            is_superuser=is_superuser,
            is_staff=is_staff or is_superuser,
        )
        if groups:
            user.groups.add(*groups)
        if permissions:
            user.user_permissions.add(*permissions)
        return user

    return make_user


@pytest.fixture
def user_client_factory(user_factory):
    def make_user_client(
        *,
        email=DEFAULT_USER_EMAIL,
        password=DEFAULT_USER_PASSWORD,
        last_login=DEFAULT_USER_LAST_LOGIN,
        is_superuser=DEFAULT_USER_IS_SUPERUSER,
        is_staff=DEFAULT_USER_IS_STAFF,
        groups=DEFAULT_USER_GROUPS,
        permissions=DEFAULT_USER_PERMISSIONS,
    ):
        user = user_factory(
            email=email,
            password=password,
            last_login=last_login,
            is_superuser=is_superuser,
            is_staff=is_staff,
            groups=groups,
            permissions=permissions,
        )
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
def document_factory(
    db,
    settings,
    tmp_path,
    uploaded_file_from_fixture_factory,
    user_factory,
):
    def make_document(
        *,
        owner=DEFAULT_DOCUMENT_OWNER,
        email=DEFAULT_USER_EMAIL,
        password=DEFAULT_USER_PASSWORD,
        state=DEFAULT_DOCUMENT_STATE,
        file=DEFAULT_DOCUMENT_FILE,
        file_name=DEFAULT_DOCUMENT_FILE_NAME,
        file_type=DEFAULT_DOCUMENT_FILE_TYPE,
        total_pages=DEFAULT_DOCUMENT_TOTAL_PAGES,
    ):
        settings.MEDIA_ROOT = tmp_path

        if owner is GENERATE_DEFAULT:
            owner = user_factory(
                email=email,
                password=password,
            )

        if file is GENERATE_DEFAULT:
            source_file = uploaded_file_from_fixture_factory()
            file = SimpleUploadedFile(
                name=file_name,
                content=source_file.read(),
                content_type="application/pdf",
            )

        document = Document.objects.create(
            owner=owner,
            state=state,
            file_name=file_name,
            file_type=file_type,
            total_pages=total_pages,
        )
        # 本番のDocumentSerializerと同様、ID確定後にファイルを保存する。
        document.file.save(file.name, file, save=True)
        return document

    return make_document


@pytest.fixture
def page_factory(db, document_factory):
    def make_page(
        *,
        doc=DEFAULT_PAGE_DOCUMENT,
        owner=DEFAULT_DOCUMENT_OWNER,
        email=DEFAULT_USER_EMAIL,
        password=DEFAULT_USER_PASSWORD,
        image=DEFAULT_PAGE_IMAGE,
        state=DEFAULT_PAGE_STATE,
        page_number=DEFAULT_PAGE_NUMBER,
        width_px=DEFAULT_PAGE_WIDTH_PX,
        height_px=DEFAULT_PAGE_HEIGHT_PX,
    ):
        if doc is GENERATE_DEFAULT:
            doc = document_factory(
                owner=owner,
                email=email,
                password=password,
            )

        return Page.objects.create(
            doc=doc,
            image=image,
            state=state,
            page_number=page_number,
            width_px=width_px,
            height_px=height_px,
        )

    return make_page


@pytest.fixture
def word_factory(db, page_factory):
    def make_word(
        *,
        page=DEFAULT_WORD_PAGE,
        doc=DEFAULT_PAGE_DOCUMENT,
        owner=DEFAULT_DOCUMENT_OWNER,
        email=DEFAULT_USER_EMAIL,
        password=DEFAULT_USER_PASSWORD,
        bbox=DEFAULT_WORD_BBOX,
        content=DEFAULT_WORD_CONTENT,
        direction=DEFAULT_WORD_DIRECTION,
        rec_score=DEFAULT_WORD_REC_SCORE,
        det_score=DEFAULT_WORD_DET_SCORE,
    ):
        if page is GENERATE_DEFAULT:
            page = page_factory(
                doc=doc,
                owner=owner,
                email=email,
                password=password,
            )

        return Word.objects.create(
            page=page,
            bbox=bbox,
            content=content,
            direction=direction,
            rec_score=rec_score,
            det_score=det_score,
        )

    return make_word


@pytest.fixture
def preview_word_ocr_request_factory():
    def make_preview_word_ocr_request(
        *,
        mode=DEFAULT_PREVIEW_WORD_OCR_MODE,
        document=None,
        doc=DEFAULT_PREVIEW_DOCUMENT_ID,
        page_number=DEFAULT_PAGE_NUMBER,
        preview_id=DEFAULT_PREVIEW_ID,
        bbox=DEFAULT_WORD_BBOX,
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
