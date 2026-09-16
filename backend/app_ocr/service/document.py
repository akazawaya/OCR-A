from django.core.files.base import ContentFile

from app_ocr.etc.tools import render_page
from app_ocr.serializers import PageSerializer


# OCRを行わず、pageスキーマの生成を行う層
def create_pages_from_document_file(document):
    input_ext = document.get_file_type_display()

    for page_number in range(1, document.total_pages + 1):
        img_bytes = render_page(
            file=document.file,
            page_number=page_number,
            input_ext=input_ext,
        )
        page_serializer = PageSerializer(
            data={
                "doc": document.pk,
                "image": ContentFile(img_bytes, name=f"{page_number}.png"),
                "page_number": page_number,
            },
            # UserScopedPrimaryKeyRelatedFieldで所有者検証するため、
            # document.ownerをcontextへ渡す
            context={"user": document.owner},
        )
        page_serializer.is_valid(raise_exception=True)
        page_serializer.save()
