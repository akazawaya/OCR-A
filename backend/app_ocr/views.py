from uuid import uuid4

from django.contrib.auth.models import User
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets

# from app_ocr.permissions import IsOwnerOrReadOnly
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from app_ocr.etc.tools import inspect_file
from app_ocr.filters import DocumentFilterSet
from app_ocr.models import Document, FileType, Page, State, Word
from app_ocr.serializers import (
    DocumentSerializer,
    DocumentUploadSerializer,
    PageSerializer,
    PreviewWordOcrJobResultSerializer,
    PreviewWordOcrRequestSerializer,
    UserSerializer,
    WordSerializer,
)
from app_ocr.service.document import create_pages_from_document_file
from app_ocr.service.preview_word_ocr_cache import (
    get_preview_word_ocr_job,
    set_preview_word_ocr_job,
)
from app_ocr.storage import (
    build_document_storage_prefix,
    delete_document_files,
)
from app_ocr.tasks import (
    dispatch_ocr_pages_task,
    notify_document_state_changed,
    ocr_word_task,
)


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = DocumentFilterSet

    def build_document_serializer_from_file(self, file):
        upload_serializer = DocumentUploadSerializer(data={"file": file})
        upload_serializer.is_valid(raise_exception=True)

        try:
            ext_label, total_pages = inspect_file(file)
        except ValueError as e:
            raise ValidationError({"detail": str(e)}) from e

        serializer = self.get_serializer(
            data={
                "file": file,
                "file_name": file.name,
                "file_type": FileType.label_to_value(ext_label),
                "total_pages": total_pages,
            }
        )
        serializer.is_valid(raise_exception=True)
        return serializer

    def create(self, request, *args, **kwargs):
        file = request.FILES.get("file")
        serializer = self.build_document_serializer_from_file(file)
        document = None

        try:
            with transaction.atomic():
                document = serializer.save()
                create_pages_from_document_file(document)
                document.state = State.SUCCESS
                document.save(update_fields=["state"])
                transaction.on_commit(
                    lambda: notify_document_state_changed(
                        document_id=document.pk,
                        state=State.SUCCESS,
                    )
                )
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        # Djangoのトランザクションのロールバックにfileは含まれないため、
        # 失敗時のfile削除が行われるようにExceptionを追加(ocrも同様)
        except Exception:
            if document is not None:
                prefix = build_document_storage_prefix(document.pk)
                delete_document_files(document, prefix)
            raise

    @action(detail=False, methods=["post"], url_path="ocr")
    def ocr(self, request):
        file = request.FILES.get("file")
        serializer = self.build_document_serializer_from_file(file)
        document = None
        try:
            with transaction.atomic():
                document = serializer.save()
                document_id = document.pk
                transaction.on_commit(
                    lambda: (
                        notify_document_state_changed(
                            document_id=document_id,
                            state=State.QUEUED,
                        ),
                        dispatch_ocr_pages_task.delay(document_id),
                    )
                )
            return Response(
                {"document": DocumentSerializer(document).data},
                status=status.HTTP_202_ACCEPTED,
            )

        except Exception:
            if document is not None:
                prefix = build_document_storage_prefix(document.pk)
                delete_document_files(document, prefix)
            raise


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

    @action(detail=False, methods=["post"], url_path="ocr")
    def ocr(self, request):
        serializer = PreviewWordOcrRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        preview_job_id = str(uuid4())
        set_preview_word_ocr_job(
            preview_job_id,
            {
                "state": State.QUEUED,
                **serializer.validated_data,
            },
        )
        ocr_word_task.apply_async(
            args=[preview_job_id],
            queue="ocr_word_queue",
        )
        return Response(
            {"preview_job_id": preview_job_id},
            status=status.HTTP_202_ACCEPTED,
        )

    @action(
        detail=False,
        methods=["get"],
        url_path=r"ocr/(?P<preview_job_id>[^/.]+)",
    )
    def ocr_result(self, request, preview_job_id=None):
        job = get_preview_word_ocr_job(preview_job_id)
        if job is None:
            return Response(
                {"detail": "preview OCR job not found or expired."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = PreviewWordOcrJobResultSerializer(data=job)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)
