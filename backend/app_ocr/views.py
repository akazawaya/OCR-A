from django.contrib.auth.models import User
from app_ocr.models import FileType, Document, Page, Word

from rest_framework.response import Response

from app_ocr.serializers import (
    UserSerializer,
    DocumentSerializer,
    PageSerializer,
    WordSerializer,
)

# from app_ocr.permissions import IsOwnerOrReadOnly
from rest_framework.decorators import action
from rest_framework import mixins, viewsets
from rest_framework import status
from app_ocr.etc.tools import inspect_file

from rest_framework.parsers import MultiPartParser, FormParser
from django.db import transaction

from django_filters.rest_framework import DjangoFilterBackend
from app_ocr.filters import DocumentFilter
from rest_framework.filters import OrderingFilter
from app_ocr.tasks import dispatch_ocr_pages_task


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = DocumentFilter

    @action(detail=False, methods=["post"])
    def start_ocr(self, request):
        file = request.FILES.get("file")
        ext_label, total_pages = inspect_file(file)
        doc = DocumentSerializer(
            data={
                "file": file,
                "file_name": file.name,
                "file_type": FileType.label_to_value(ext_label),
                "total_pages": total_pages,
            }
        )
        doc.is_valid(raise_exception=True)

        with transaction.atomic():
            doc.save()
            # テストでocr_page実行
            transaction.on_commit(
                lambda: dispatch_ocr_pages_task.delay(doc.instance.pk)
            )
        return Response({"document": doc.data}, status=status.HTTP_202_ACCEPTED)


class PageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Page.objects.all()
    serializer_class = PageSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["doc"]


class WordViewSet(mixins.UpdateModelMixin, viewsets.ReadOnlyModelViewSet):
    # UpdateModelMixin を多重継承で足すとPATCH/PUTが生える
    # ReadOnlyModelViewSetはREAD単体用の合成クラスというだけで他CRUDをロックしているわけではない
    queryset = Word.objects.all()
    serializer_class = WordSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["page__page_number", "page__doc", "page"]
