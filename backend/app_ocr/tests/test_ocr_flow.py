import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, call, patch

import cv2
import numpy as np
import pytest
from django.urls import reverse

from app_ocr.consumers import OcrProgressConsumer
from app_ocr.etc.tools import inspect_file, render_page
from app_ocr.etc.yomitoku_adapter import get_engine, init_engine, yomitoku_ocr
from app_ocr.models import Direction, Document, FileType, Page, State, Word
from app_ocr.service.ocr import run_ocr_for_bbox, run_ocr_for_page
from app_ocr.tasks import (
    dispatch_ocr_pages_task,
    notify_document_changed,
    notify_preview_word_ocr_changed,
    ocr_page_task,
    ocr_word_task,
)
from app_ocr.tests.conftest import DEFAULT_EMAIL

FIXTURE_DIR = Path(__file__).parent / "fixtures"


# AWSのOCR推論用EC2を起動するための有効化引数をOFF
# AWS関連のテストはすべてAWS/に分離する
@pytest.fixture(autouse=True)
def disable_gpu_worker_autostart(settings):
    settings.ENABLE_GPU_WORKER_AUTOSTART = False


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


class TestTasks:
    def test_notify_document_changed_sends_group_message(self):
        with (
            patch("app_ocr.tasks.get_channel_layer") as mock_get_channel_layer,
            patch("app_ocr.tasks.async_to_sync") as mock_async_to_sync,
        ):
            mock_channel_layer = mock_get_channel_layer.return_value
            mock_group_send = mock_async_to_sync.return_value

            notify_document_changed()

        mock_async_to_sync.assert_called_once_with(mock_channel_layer.group_send)
        mock_group_send.assert_called_once_with(
            "broadcast",
            {
                "type": "document_changed",
            },
        )

    def test_notify_preview_word_ocr_changed_sends_group_message(self):
        with (
            patch("app_ocr.tasks.get_channel_layer") as mock_get_channel_layer,
            patch("app_ocr.tasks.async_to_sync") as mock_async_to_sync,
        ):
            mock_channel_layer = mock_get_channel_layer.return_value
            mock_group_send = mock_async_to_sync.return_value

            notify_preview_word_ocr_changed(
                preview_job_id="preview-job-1",
                state=State.SUCCESS,
            )

        mock_async_to_sync.assert_called_once_with(mock_channel_layer.group_send)
        mock_group_send.assert_called_once_with(
            "broadcast",
            {
                "type": "preview_word_ocr_changed",
                "preview_job_id": "preview-job-1",
                "state": State.SUCCESS,
            },
        )

    @pytest.mark.django_db
    def test_dispatch_ocr_pages_task_sets_processing_and_dispatches_each_page(
        self,
        django_user_model,
    ):
        owner = django_user_model.objects.create_user(email=DEFAULT_EMAIL)
        with (
            patch("app_ocr.tasks.notify_document_changed") as mock_notify,
            patch("app_ocr.tasks.ocr_page_task.delay") as mock_delay,
        ):
            doc = Document.objects.create(
                owner=owner,
                file_name="sample.pdf",
                file_type=FileType.PDF,
                total_pages=3,
            )

            dispatch_ocr_pages_task(document_id=doc.id)

        doc.refresh_from_db()

        assert doc.state == State.PROCESSING
        mock_notify.assert_called_once_with()
        mock_delay.assert_has_calls(
            [
                call(doc.id, 1),
                call(doc.id, 2),
                call(doc.id, 3),
            ]
        )
        assert mock_delay.call_count == 3

    @pytest.mark.django_db
    def test_ocr_page_task_success_when_all_pages_finish(self, django_user_model):
        owner = django_user_model.objects.create_user(email=DEFAULT_EMAIL)
        with (
            patch("app_ocr.tasks.run_ocr_for_page"),
            patch("app_ocr.tasks.notify_document_changed") as mock_notify,
        ):
            doc = Document.objects.create(
                owner=owner,
                file_name="sample.pdf",
                file_type=FileType.PDF,
                total_pages=2,
            )
            page1 = Page.objects.create(doc=doc, page_number=1)
            page2 = Page.objects.create(doc=doc, page_number=2)

            ocr_page_task(document_id=doc.id, page_number=page1.page_number)

            doc.refresh_from_db()
            page1.refresh_from_db()
            page2.refresh_from_db()

            assert page1.state == State.SUCCESS
            assert page2.state != State.SUCCESS
            assert doc.state != State.SUCCESS
            mock_notify.assert_not_called()

            ocr_page_task(document_id=doc.id, page_number=page2.page_number)

        doc.refresh_from_db()
        page2.refresh_from_db()

        assert page2.state == State.SUCCESS
        assert doc.state == State.SUCCESS
        mock_notify.assert_called_once_with()

    @pytest.mark.django_db
    def test_ocr_page_task_failed_when_run_ocr_raises(self, django_user_model):
        owner = django_user_model.objects.create_user(email=DEFAULT_EMAIL)
        with (
            patch(
                "app_ocr.tasks.run_ocr_for_page",
                side_effect=RuntimeError("ocr failed"),
            ),
            patch("app_ocr.tasks.notify_document_changed") as mock_notify,
        ):
            doc = Document.objects.create(
                owner=owner,
                file_name="sample.pdf",
                file_type=FileType.PDF,
                total_pages=1,
            )
            page = Page.objects.create(doc=doc, page_number=1)

            with pytest.raises(RuntimeError):
                ocr_page_task(document_id=doc.id, page_number=page.page_number)

        doc.refresh_from_db()
        page.refresh_from_db()

        assert page.state == State.FAILED
        assert doc.state == State.FAILED
        mock_notify.assert_called_once_with()

    def test_ocr_word_task_updates_cache_and_notifies_success(self):
        cache_snapshots = []

        def record_cache_update(preview_job_id, payload):
            cache_snapshots.append((preview_job_id, payload.copy()))

        with (
            patch(
                "app_ocr.tasks.get_preview_word_ocr_job",
                return_value={
                    "state": State.QUEUED,
                    "mode": "rewrite_content",
                    "preview_id": "preview:1",
                    "doc": 1,
                    "page_number": 2,
                    "bbox": [1, 1, 20, 12],
                },
            ),
            patch(
                "app_ocr.tasks.set_preview_word_ocr_job",
                side_effect=record_cache_update,
            ),
            patch(
                "app_ocr.tasks.run_ocr_for_bbox",
                return_value=[
                    {
                        "bbox": [[1, 1], [20, 1], [20, 12], [1, 12]],
                        "content": "bbox text",
                        "direction": Direction.HORIZONTAL,
                    }
                ],
            ) as mock_run_ocr_for_bbox,
            patch("app_ocr.tasks.notify_preview_word_ocr_changed") as mock_notify,
        ):
            ocr_word_task("preview-job-1")

        mock_run_ocr_for_bbox.assert_called_once_with(
            document_id=1,
            page_number=2,
            bbox=[1, 1, 20, 12],
        )
        assert cache_snapshots[0] == (
            "preview-job-1",
            {
                "state": State.PROCESSING,
                "mode": "rewrite_content",
                "preview_id": "preview:1",
                "doc": 1,
                "page_number": 2,
                "bbox": [1, 1, 20, 12],
            },
        )
        assert cache_snapshots[1][0] == "preview-job-1"
        assert cache_snapshots[1][1]["state"] == State.SUCCESS
        assert cache_snapshots[1][1]["content"] == "bbox text"
        mock_notify.assert_called_once_with("preview-job-1", State.SUCCESS)

    def test_ocr_word_task_updates_cache_and_notifies_failure(self):
        cache_snapshots = []

        def record_cache_update(preview_job_id, payload):
            cache_snapshots.append((preview_job_id, payload.copy()))

        with (
            patch(
                "app_ocr.tasks.get_preview_word_ocr_job",
                return_value={
                    "state": State.QUEUED,
                    "mode": "replace_words",
                    "preview_id": "preview:1",
                    "doc": 1,
                    "page_number": 2,
                    "bbox": [1, 1, 20, 12],
                },
            ),
            patch(
                "app_ocr.tasks.set_preview_word_ocr_job",
                side_effect=record_cache_update,
            ),
            patch(
                "app_ocr.tasks.run_ocr_for_bbox",
                side_effect=RuntimeError("ocr failed"),
            ),
            patch("app_ocr.tasks.notify_preview_word_ocr_changed") as mock_notify,
        ):
            with pytest.raises(RuntimeError):
                ocr_word_task("preview-job-1")

        assert cache_snapshots[-1][1]["state"] == State.FAILED
        assert cache_snapshots[-1][1]["error_message"] == "ocr failed"
        mock_notify.assert_called_once_with("preview-job-1", State.FAILED)


@pytest.mark.django_db
class TestOcrApi:
    def test_ocr_creates_cache_job_and_dispatches_task(
        self,
        authenticated_client,
    ):
        with (
            patch("app_ocr.views.uuid4", return_value="preview-job-1"),
            patch("app_ocr.views.set_preview_word_ocr_job") as mock_set_job,
            patch("app_ocr.views.ocr_word_task.apply_async") as mock_apply_async,
        ):
            response = authenticated_client.post(
                reverse("word-ocr"),
                {
                    "mode": "rewrite_content",
                    "preview_id": "preview:1",
                    "doc": 1,
                    "page_number": 2,
                    "bbox": [1, 1, 20, 12],
                },
                format="json",
            )

        assert response.status_code == 202
        assert response.data == {"preview_job_id": "preview-job-1"}
        mock_set_job.assert_called_once_with(
            "preview-job-1",
            {
                "state": State.QUEUED,
                "mode": "rewrite_content",
                "preview_id": "preview:1",
                "doc": 1,
                "page_number": 2,
                "bbox": [1, 1, 20, 12],
            },
        )
        mock_apply_async.assert_called_once_with(
            args=["preview-job-1"],
            queue="ocr_word_queue",
        )

    def test_ocr_result_returns_cached_job(self, authenticated_client):
        with patch(
            "app_ocr.views.get_preview_word_ocr_job",
            return_value={
                "state": State.SUCCESS,
                "mode": "rewrite_content",
                "preview_id": "preview:1",
                "content": "bbox text",
            },
        ):
            response = authenticated_client.get(
                reverse(
                    "word-ocr-result",
                    kwargs={"preview_job_id": "preview-job-1"},
                )
            )

        assert response.status_code == 200
        assert response.data["state"] == State.SUCCESS
        assert response.data["content"] == "bbox text"

    def test_ocr_result_returns_404_when_cache_expired(self, authenticated_client):
        with patch("app_ocr.views.get_preview_word_ocr_job", return_value=None):
            response = authenticated_client.get(
                reverse(
                    "word-ocr-result",
                    kwargs={"preview_job_id": "preview-job-1"},
                )
            )

        assert response.status_code == 404


class TestConsumer:
    def test_connect_accepts_and_joins_broadcast_group(self):
        consumer = OcrProgressConsumer()
        consumer.accept = Mock()
        consumer.channel_layer = Mock()
        consumer.channel_name = "test-channel"

        with patch("app_ocr.consumers.async_to_sync") as mock_async_to_sync:
            mock_group_add = mock_async_to_sync.return_value
            consumer.connect()

        consumer.accept.assert_called_once()
        assert consumer.group_name == "broadcast"
        mock_async_to_sync.assert_called_once_with(consumer.channel_layer.group_add)
        mock_group_add.assert_called_once_with("broadcast", "test-channel")

    def test_disconnect_leaves_broadcast_group(self):
        consumer = OcrProgressConsumer()
        consumer.group_name = "broadcast"
        consumer.channel_layer = Mock()
        consumer.channel_name = "test-channel"

        with patch("app_ocr.consumers.async_to_sync") as mock_async_to_sync:
            mock_group_discard = mock_async_to_sync.return_value
            consumer.disconnect(close_code=1000)

        mock_async_to_sync.assert_called_once_with(consumer.channel_layer.group_discard)
        mock_group_discard.assert_called_once_with("broadcast", "test-channel")

    # payloadの中身は暫定かつ未使用のため、そこまで深掘りしない
    def test_document_changed_sends_websocket_message(self):
        consumer = OcrProgressConsumer()
        consumer.send = Mock()
        consumer.document_changed({})

        consumer.send.assert_called_once()
        sent_payload = json.loads(consumer.send.call_args.kwargs["text_data"])

        assert sent_payload == {"type": "document_changed"}

    def test_preview_word_ocr_changed_sends_websocket_message(self):
        consumer = OcrProgressConsumer()
        consumer.send = Mock()
        consumer.preview_word_ocr_changed(
            {
                "preview_job_id": "preview-job-1",
                "state": "SUCCESS",
            }
        )

        consumer.send.assert_called_once()
        sent_payload = json.loads(consumer.send.call_args.kwargs["text_data"])

        assert sent_payload == {
            "type": "preview_word_ocr_changed",
            "preview_job_id": "preview-job-1",
            "state": "SUCCESS",
        }


@pytest.mark.django_db
def test_run_ocr_for_page_creates_page_and_words_from_ocr_result(
    django_user_model, uploaded_file_from_fixture_factory
):
    # OCRエンジンを差し替え、OCRインスタンスが呼ばれたかの確認と、
    # mockの返り値で保存がなされたかを確認
    owner = django_user_model.objects.create_user(email=DEFAULT_EMAIL)
    with (
        patch("app_ocr.service.ocr.get_engine") as mock_get_engine,
        patch("app_ocr.service.ocr.yomitoku_ocr") as mock_yomitoku_ocr,
    ):
        mock_ocr = object()
        mock_get_engine.return_value = mock_ocr
        mock_yomitoku_ocr.return_value = [
            {
                "points": [[0, 0], [10, 0], [10, 10], [0, 10]],
                "content": "test",
                "direction": "horizontal",
                "rec_score": 0.9,
                "det_score": 0.8,
            }
        ]
        file = uploaded_file_from_fixture_factory("table.jpg", "image/jpeg")
        doc = Document.objects.create(
            owner=owner,
            file=file,
            file_name="table.jpg",
            file_type=FileType.JPG,
            total_pages=1,
        )

        result = run_ocr_for_page(document_id=doc.id, page_number=1)

    page = Page.objects.get(doc=doc, page_number=1)
    word = Word.objects.get(page=page)

    assert result["doc_id"] == doc.id
    assert result["page_number"] == 1
    assert result["page_id"] == page.id
    assert result["word_count"] == 1
    assert word.content == "test"
    assert word.rec_score == 0.9
    assert word.det_score == 0.8


@pytest.mark.django_db
def test_run_ocr_for_bbox_returns_words_without_saving_page_or_words(
    django_user_model, uploaded_file_from_fixture_factory
):
    # 本質ではないが、run_ocr_for_bboxは単体では保存がされないことをアサ―トとする
    owner = django_user_model.objects.create_user(email=DEFAULT_EMAIL)
    with (
        patch("app_ocr.service.ocr.get_engine") as mock_get_engine,
        patch("app_ocr.service.ocr.yomitoku_ocr") as mock_yomitoku_ocr,
    ):
        mock_ocr = object()
        mock_get_engine.return_value = mock_ocr
        mock_yomitoku_ocr.return_value = [
            {
                "points": [[1, 1], [20, 1], [20, 12], [1, 12]],
                "content": "bbox text",
                "direction": "horizontal",
                "rec_score": 0.95,
                "det_score": 0.85,
            }
        ]
        file = uploaded_file_from_fixture_factory("table.jpg", "image/jpeg")
        doc = Document.objects.create(
            owner=owner,
            file=file,
            file_name="table.jpg",
            file_type=FileType.JPG,
            total_pages=1,
        )
        bbox = [1, 1, 20, 12]
        result = run_ocr_for_bbox(document_id=doc.id, page_number=1, bbox=bbox)

    # 保存されないため直接返り値をアサ―トする
    assert result == [
        {
            "bbox": [[1, 1], [20, 1], [20, 12], [1, 12]],
            "content": "bbox text",
            "direction": Direction.HORIZONTAL,
            "rec_score": 0.95,
            "det_score": 0.85,
        }
    ]
    mock_yomitoku_ocr.assert_called_once()
    kwargs = mock_yomitoku_ocr.call_args.kwargs

    assert kwargs["ocr_instance"] is mock_ocr
    assert kwargs["bbox"] == bbox
    assert isinstance(kwargs["img_bytes"], bytes)
    assert len(kwargs["img_bytes"]) > 0

    assert Page.objects.count() == 0
    assert Word.objects.count() == 0


class TestYomitokuAdapter:
    def test_init_engine_creates_ocr_with_auto_device(self):
        with patch("app_ocr.etc.yomitoku_adapter.OCR") as mock_ocr:
            init_engine()
        mock_ocr.assert_called_once_with(visualize=False, device="auto")

    def test_get_engine_uses_cached_engine(self):
        get_engine.cache_clear()
        with patch("app_ocr.etc.yomitoku_adapter.init_engine") as mock_init_engine:
            mock_init_engine.return_value = object()

            first = get_engine()
            second = get_engine()

        assert first is second
        mock_init_engine.assert_called_once()

        get_engine.cache_clear()

    def test_yomitoku_ocr_returns_word_dicts(self, uploaded_file_from_fixture_factory):
        file = uploaded_file_from_fixture_factory("table.jpg", "image/jpeg")
        img_bytes = file.read()
        word = SimpleNamespace(
            points=[[0, 0], [10, 0], [10, 10], [0, 10]],
            content="test",
            direction="horizontal",
            det_score=0.8,
            rec_score=0.9,
        )
        ocr_instance = Mock(
            return_value=(
                SimpleNamespace(words=[word]),
                None,
            )
        )
        result = yomitoku_ocr(img_bytes=img_bytes, ocr_instance=ocr_instance)
        assert result == [
            {
                "points": word.points,
                "content": "test",
                "direction": "horizontal",
                "det_score": 0.8,
                "rec_score": 0.9,
            }
        ]
        ocr_instance.assert_called_once()

    def test_yomitoku_ocr_rejects_invalid_image_bytes(self):
        ocr_instance = Mock()
        with pytest.raises(ValueError, match="Invalid image bytes"):
            yomitoku_ocr(b"not image", ocr_instance)
