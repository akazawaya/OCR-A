from django.core.files.base import ContentFile
from django.db import transaction

from app_ocr.etc.tools import render_page
from app_ocr.models import Direction, Document, State
from app_ocr.serializers import PageSerializer, WordSerializer


def _run_yomitoku_on_rendered_page(document_id, page_number, bbox=None):
    # CPU用コンテナでもDjango/Celeryがこのモジュールをimportできるよう、
    # GPU用optional dependencyであるYomitokuは推論時にだけimportする。
    from app_ocr.etc.yomitoku_adapter import get_engine, yomitoku_ocr

    doc = Document.objects.get(pk=document_id)
    ocr = get_engine()
    input_ext = doc.get_file_type_display()
    img_bytes = render_page(doc.file, page_number, input_ext)
    ocr_kwargs = {
        "img_bytes": img_bytes,
        "ocr_instance": ocr,
    }
    if bbox is not None:
        ocr_kwargs["bbox"] = bbox
    words = yomitoku_ocr(**ocr_kwargs)
    return doc, img_bytes, words


def run_ocr_for_page(document_id, page_number):
    _, img_bytes, words = _run_yomitoku_on_rendered_page(document_id, page_number)
    img_file = ContentFile(img_bytes, name=f"{page_number}.png")

    with transaction.atomic():
        # _run_yomitoku_on_rendered_pageの返り値docは無視。
        # current_documentという名称でFAILED以外をSerializer.save()の対象とする
        current_document = Document.objects.select_for_update().get(
            pk=document_id,
        )
        if current_document.state == State.FAILED:
            return None

        page_serializer = PageSerializer(
            data={
                "doc": current_document.pk,
                "image": img_file,
                "page_number": page_number,
            },
            # UserScopedPrimaryKeyRelatedFieldで所有者検証するため、
            # current_document.ownerをcontextへ渡す
            context={"user": current_document.owner},
        )
        page_serializer.is_valid(raise_exception=True)
        page_instance = page_serializer.save()
        for w in words:
            word_serializer = WordSerializer(
                data={
                    "page": page_instance.pk,
                    "bbox": w["points"],
                    "content": w["content"],
                    "direction": Direction.label_to_value(w["direction"]),
                    "rec_score": w["rec_score"],
                    "det_score": w["det_score"],
                },
                # UserScopedPrimaryKeyRelatedFieldで所有者検証するため、
                # current_document.ownerをcontextへ渡す
                context={"user": current_document.owner},
            )
            word_serializer.is_valid(raise_exception=True)
            word_serializer.save()
    return {
        "doc_id": document_id,
        "page_number": page_number,
        "page_id": page_instance.pk,
        "word_count": len(words),
    }


def run_ocr_for_bbox(document_id, page_number, bbox):
    # run_ocr_for_bboxはpreviewWordという、
    # frontendのcache値に適用する方針のため、保存を伴わない
    _, _, words = _run_yomitoku_on_rendered_page(document_id, page_number, bbox=bbox)
    return [
        {
            "bbox": w["points"],
            "content": w["content"],
            "direction": Direction.label_to_value(w["direction"]),
            "rec_score": w["rec_score"],
            "det_score": w["det_score"],
        }
        for w in words
    ]
