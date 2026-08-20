from unittest.mock import patch

import cv2
import numpy as np
import pytest
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from app_ocr.etc.tools import inspect_file, render_page
from app_ocr.models import Document, State
from app_ocr.tasks import ocr_word_task


@pytest.fixture
def api_client():
    return APIClient()


# AWSのOCR推論用EC2を起動するための有効化引数をOFF
# AWS関連のテストはすべてAWS/に分離する
@pytest.fixture(autouse=True)
def disable_gpu_worker_autostart(settings):
    settings.ENABLE_GPU_WORKER_AUTOSTART = False


@pytest.fixture(autouse=True)
def synchronous_celery_and_inmemory_channels(settings):
    # .delay() .apply_async()でtaskをworkerに積まず即実行する設定
    # send_task()は例外だが このテストではworkerの動作まで保証しないことを意味する
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True

    # Redisを使い回すと実DBを汚す恐れがあるため。代わりのChannelを導入
    settings.CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }


"""
test_inspect_file
inspect_file関数をテストする。
実ファイルによるメタデータ二種の読み取りをテスト
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
    uploaded_file_from_fixture_factory,
    content_type,
    expected_ext,
    expected_total_pages,
):
    file = uploaded_file_from_fixture_factory(filename, content_type)
    ext, total_pages = inspect_file(file)

    assert ext == expected_ext
    assert total_pages == expected_total_pages


class TestRenderPage:
    @pytest.mark.parametrize(
        "filename, content_type, input_ext",
        [
            ("sample.pdf", "application/pdf", "pdf"),
            ("table.jpg", "image/jpeg", "jpg"),
        ],
    )
    def test_returns_valid_img_bytes(
        self,
        uploaded_file_from_fixture_factory,
        filename,
        content_type,
        input_ext,
    ):
        file = uploaded_file_from_fixture_factory(filename, content_type)

        img_bytes = render_page(file=file, page_number=1, input_ext=input_ext)
        # 保存処理 渡せるバイト列であることを確認
        assert isinstance(img_bytes, bytes)

        # OCR処理 pytestではOCRエンジンを動かせないため、代替として、
        # render_pageの出力をOCR前処理と同じBGR配列へ変換できることを確認する。
        # これは画像の読み取り可否のみを保証し、OCRの実行・認識品質は保証しない。
        img_arr_1d = np.frombuffer(img_bytes, dtype=np.uint8)
        img_arr_bgr = cv2.imdecode(img_arr_1d, cv2.IMREAD_COLOR)

        assert img_arr_bgr is not None
        assert img_arr_bgr.shape[0] > 0  # 高さ
        assert img_arr_bgr.shape[1] > 0  # 幅
        assert img_arr_bgr.shape[2] == 3  # 3チャンネルBGR

    @pytest.mark.parametrize(
        "filename, content_type, input_ext",
        [
            ("sample.pdf", "application/pdf", "pdf"),
            ("table.jpg", "image/jpeg", "jpg"),
        ],
    )
    def test_resets_file_pointer(
        self,
        uploaded_file_from_fixture_factory,
        filename,
        content_type,
        input_ext,
    ):
        file = uploaded_file_from_fixture_factory(filename, content_type)
        render_page(file=file, page_number=1, input_ext=input_ext)
        assert file.tell() == 0

    def test_rejects_invalid_page_number(self, uploaded_file_from_fixture_factory):
        file = uploaded_file_from_fixture_factory()

        with pytest.raises(ValueError, match="page_number must be 1-based"):
            render_page(file=file, page_number=0, input_ext="jpg")

    def test_rejects_unsupported_input_ext(self, uploaded_file_from_fixture_factory):
        file = uploaded_file_from_fixture_factory()

        with pytest.raises(ValueError, match="Unsupported file format"):
            render_page(file=file, page_number=1, input_ext="txt")


@pytest.fixture
def ocr_document(
    document_factory,
    uploaded_file_from_fixture_factory,
):
    pdf_file = uploaded_file_from_fixture_factory(
        "sample.pdf",
        "application/pdf",
    )
    _, total_pages = inspect_file(pdf_file)
    return document_factory(file=pdf_file, total_pages=total_pages)


# ocrエンジンだけ実物が動かないように差し替える
# ocr結果はアサートの関心外とする(自由に定義できる返り値mockを確認しても意味がないので)
@pytest.fixture
def mock_run_yomitoku_on_rendered_page(
    uploaded_file_from_fixture_factory,
):
    image_file = uploaded_file_from_fixture_factory(
        "table.jpg",
        "image/jpeg",
    )
    valid_image_bytes = render_page(
        file=image_file,
        page_number=1,  # 固定返り値用のbytesを1枚目で使いまわす
        input_ext="jpg",
    )

    with patch(
        "app_ocr.service.ocr._run_yomitoku_on_rendered_page",
        # returnの代わりにdocument_idに紐づいて、
        # _run_yomitoku_on_rendered_pageの想定返り値3つを返す関数を副作用として実行
        side_effect=lambda document_id, page_number, bbox=None: (
            Document.objects.get(pk=document_id),
            valid_image_bytes,
            [],
        ),
    ):
        yield


@pytest.mark.django_db(transaction=True)
def test_document_ocr_success_notifies_channel(
    authenticated_client,
    uploaded_file_from_fixture_factory,
    isolated_media_storage,
    mock_run_yomitoku_on_rendered_page,
    synchronous_celery_and_inmemory_channels,
):
    pdf_file = uploaded_file_from_fixture_factory(
        "sample.pdf",
        "application/pdf",
    )
    channel_layer = get_channel_layer()
    channel_name = async_to_sync(channel_layer.new_channel)("test")
    group_name = f"ocr_progress_user_{authenticated_client.user.pk}"
    async_to_sync(channel_layer.group_add)(group_name, channel_name)

    try:
        response = authenticated_client.post(
            reverse("document-ocr"),
            data={"file": pdf_file},
            format="multipart",
        )
        assert response.status_code == status.HTTP_202_ACCEPTED

        # 想定のws通知は３回 Document作成時/PROCESSINGへの更新時/DocumentのSUCCESS更新時
        messages = [
            async_to_sync(channel_layer.receive)(channel_name) for _ in range(3)
        ]
    finally:
        async_to_sync(channel_layer.group_discard)(group_name, channel_name)

    document = Document.objects.get(pk=response.data["document"]["id"])
    pages = list(document.pages.order_by("page_number"))

    assert document.state == State.SUCCESS
    assert len(pages) == document.total_pages
    assert all(page.state == State.SUCCESS for page in pages)
    assert messages == [
        {"type": "document_changed"},  # Document作成時
        {"type": "document_changed"},  # PROCESSINGへの更新時
        {"type": "document_changed"},  # DocumentのSUCCESS更新時
    ]


@pytest.mark.django_db(transaction=True)
def test_word_ocr_success_notifies_channel_and_result_can_be_retrieved(
    authenticated_client,
    document_factory,
    page_factory,
    preview_word_ocr_request_factory,
    isolated_media_storage,
    mock_run_yomitoku_on_rendered_page,
    synchronous_celery_and_inmemory_channels,
    settings,
):
    # eager実行したTaskの状態と返り値をresult backendへ保存する(後半のGET API用)
    settings.CELERY_TASK_STORE_EAGER_RESULT = True

    document = document_factory(owner=authenticated_client.user)
    page_factory(doc=document)
    request_data = preview_word_ocr_request_factory(
        document=document,
        mode="replace_words",  # modeの選定には特に理由はない
    )
    channel_layer = get_channel_layer()
    channel_name = async_to_sync(channel_layer.new_channel)("test")
    group_name = f"ocr_progress_user_{authenticated_client.user.pk}"
    async_to_sync(channel_layer.group_add)(group_name, channel_name)
    preview_job_id = None

    try:
        # 前半:OCR(POST) API
        # Celeryのbind処理(taskの設定初期化)は冒頭のsettings変更より先のため、
        # API実行時にもtaskを対象にstore_eager_resultの変更を明示する必要がある。
        with patch.object(ocr_word_task, "store_eager_result", True):
            post_response = authenticated_client.post(
                reverse("word-ocr"),
                data=request_data,
                format="json",
            )
        assert post_response.status_code == status.HTTP_202_ACCEPTED

        preview_job_id = post_response.data["preview_job_id"]
        assert preview_job_id
        message = async_to_sync(channel_layer.receive)(channel_name)
        # 後半:GET API
        get_response = authenticated_client.get(
            reverse(
                "word-ocr-result",
                kwargs={"preview_job_id": preview_job_id},
            )
        )
        assert get_response.status_code == status.HTTP_200_OK
    finally:
        async_to_sync(channel_layer.group_discard)(group_name, channel_name)
        if preview_job_id:
            # 後処理でresult backendの結果を消す
            ocr_word_task.AsyncResult(preview_job_id).forget()

    assert message == {
        "type": "preview_word_ocr_changed",
        "preview_job_id": preview_job_id,
        "state": State.SUCCESS,
    }
    assert get_response.data["state"] == State.SUCCESS
