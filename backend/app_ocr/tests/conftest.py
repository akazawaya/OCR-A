from datetime import UTC, datetime
from pathlib import Path
from tempfile import TemporaryDirectory

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from app_ocr.models import Direction, Document, FileType, Page, State, Word

FIXTURE_DIR = Path(__file__).parent / "fixtures"
GENERATE_DEFAULT = object()  # 他の値と一致しない固有オブジェクトで仮置き

# Userモデルのデフォルト値
DEFAULT_USER_EMAIL = "testuser@example.invalid"
DEFAULT_USER_PASSWORD = "testpass123"
DEFAULT_USER_LAST_LOGIN = datetime(2026, 1, 1, tzinfo=UTC)

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


# test中にmediaFileを差し替え、確実にテスト終了後に消えるようにする
# TemporaryDirectoryはwithを抜けるときにcleanup()を呼ぶため、自動で消える
@pytest.fixture
def isolated_media_storage(settings):
    with TemporaryDirectory(prefix="restocr-test-media-") as directory:
        media_root = Path(directory)
        settings.MEDIA_ROOT = media_root
        yield media_root


@pytest.fixture
def user_factory(db):
    user_model = get_user_model()

    def make_user(
        *,
        group_name,
        email=DEFAULT_USER_EMAIL,
        password=DEFAULT_USER_PASSWORD,
        last_login=DEFAULT_USER_LAST_LOGIN,
    ):
        if group_name == "guest_group":
            user = user_model.objects.create_guest_user(
                email=email,
                last_login=last_login,
            )
        elif group_name == "standard_group":
            user = user_model.objects.create_registered_user(
                email=email,
                password=password,
                last_login=last_login,
            )
        elif group_name == "staff_group":
            user = user_model.objects.create_superuser(
                email=email,
                password=password,
                last_login=last_login,
            )
        else:
            raise ValueError(f"未対応のGroupです: {group_name}")
        return user

    return make_user


@pytest.fixture
def user_client_factory(user_factory):
    def make_user_client(
        *,
        group_name,
        email=DEFAULT_USER_EMAIL,
        password=DEFAULT_USER_PASSWORD,
        last_login=DEFAULT_USER_LAST_LOGIN,
    ):
        user = user_factory(
            group_name=group_name,
            email=email,
            password=password,
            last_login=last_login,
        )
        client = APIClient()
        client.force_login(user)
        client.user = user
        return client, user

    return make_user_client


@pytest.fixture
def authenticated_client(user_client_factory):
    client, _ = user_client_factory(group_name="standard_group")
    return client


@pytest.fixture
def document_factory(
    db,
    isolated_media_storage,
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

        if owner is GENERATE_DEFAULT:
            owner = user_factory(
                group_name="standard_group",
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
