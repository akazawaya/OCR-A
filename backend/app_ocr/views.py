from django.contrib.auth.models import User
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets

# from app_ocr.permissions import IsOwnerOrReadOnly
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from app_ocr.etc.tools import inspect_file
from app_ocr.filters import DocumentFilterSet
from app_ocr.models import Document, FileType, Page, Word
from app_ocr.serializers import (
    DocumentSerializer,
    DocumentUploadSerializer,
    PageSerializer,
    UserSerializer,
    WordSerializer,
)
from app_ocr.tasks import dispatch_ocr_pages_task


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = DocumentFilterSet

    @action(detail=False, methods=["post"], url_path="ocr")
    def start_ocr(self, request):
        file = request.FILES.get("file")
        upload_serializer = DocumentUploadSerializer(data={"file": file})
        upload_serializer.is_valid(raise_exception=True)
        try:
            ext_label, total_pages = inspect_file(file)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
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
            transaction.on_commit(
                lambda: dispatch_ocr_pages_task.delay(doc.instance.pk)
            )
        return Response({"document": doc.data}, status=status.HTTP_202_ACCEPTED)


class PageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Page.objects.all()
    serializer_class = PageSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["doc"]


class WordViewSet(viewsets.ModelViewSet):
    queryset = Word.objects.all()
    serializer_class = WordSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["page", "page__doc"]
