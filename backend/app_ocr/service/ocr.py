from django.core.files.base import ContentFile
from django.db import transaction

from app_ocr.etc.tools import default_word_sort, render_page
from app_ocr.etc.yomitoku_adapter import get_engine, yomitoku_ocr
from app_ocr.models import Direction, Document
from app_ocr.serializers import PageSerializer, WordSerializer


def run_ocr_for_page(document_id, page_number):
    doc = Document.objects.get(pk=document_id)
    ocr = get_engine()
    input_ext = doc.get_file_type_display()
    img_bytes = render_page(doc.file, page_number, input_ext)

    words = yomitoku_ocr(img_bytes=img_bytes, ocr_instance=ocr)
    words = default_word_sort(words)

    img_file = ContentFile(img_bytes, name=f"{page_number}.png")

    with transaction.atomic():
        page_serializer = PageSerializer(
            data={
                "doc": doc.pk,
                "image": img_file,
                "page_number": page_number,
            }
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
                }
            )
            word_serializer.is_valid(raise_exception=True)
            word_serializer.save()

    return {
        "doc_id": document_id,
        "page_number": page_number,
        "page_id": page_instance.pk,
        "word_count": len(words),
    }
