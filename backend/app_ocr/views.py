from uuid import uuid4

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, DjangoModelPermissions, IsAuthenticated
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
    UserCreateSerializer,
    UserSerializer,
    WordSerializer,
)
from app_ocr.service.document import create_pages_from_document_file
from app_ocr.service.gpu_worker.worker_instance import ensure_gpu_worker_running
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
    notify_document_changed,
    ocr_word_task,
)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]

        return super().get_permissions()

    def create(self, request):
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        login(request, user)

        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=False,
        methods=["delete"],
        permission_classes=[IsAuthenticated],
    )
    def me(self, request):
        user = request.user
        if not user.groups.filter(name="guest").exists():
            return Response(status=status.HTTP_403_FORBIDDEN)

        logout(request)
        user.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


class AuthViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    @action(detail=False, methods=["get"])
    def me(self, request):
        user = request.user

        return Response(
            {
                "authenticated": user.is_authenticated,
                "username": user.username if user.is_authenticated else None,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"])
    def login(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        user = authenticate(request, username=username, password=password)

        if user is None:
            return Response(
                status=status.HTTP_400_BAD_REQUEST,
            )

        login(request, user)

        return Response(
            {
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"])
    def logout(self, request):
        logout(request)
        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = DocumentFilterSet
    # serializerでsource="get_foo_display"を使用している場合、
    # DRFのデフォルトではordering対象と認識されなくなるため、明示する
    ordering_fields = ["created", "file_name", "state"]

    # get_querysetをオーバーライドしてuserによるfilterを追加する
    def get_queryset(self):
        return Document.objects.filter(owner=self.request.user)

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
                # owner(外部キー)はserializerの入力スキーマには含めないが、
                # Documentモデルの保存には必須であるため追加する（ocrも同様）
                document = serializer.save(owner=self.request.user)
                create_pages_from_document_file(document)
                document.state = State.SUCCESS
                document.save(update_fields=["state"])
                transaction.on_commit(notify_document_changed)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        # Djangoのトランザクションのロールバックにfileは含まれないため、
        # 失敗時のfile削除が行われるようにExceptionを追加(ocrも同様)
        except Exception:
            if document is not None:
                prefix = build_document_storage_prefix(document.pk)
                delete_document_files(document, prefix)
            raise

    @action(
        detail=False,
        methods=["post"],
        url_path="ocr",
        permission_classes=[IsAuthenticated, DjangoModelPermissions],
    )
    def ocr(self, request):
        file = request.FILES.get("file")
        serializer = self.build_document_serializer_from_file(file)
        document = None
        try:
            with transaction.atomic():
                document = serializer.save(owner=self.request.user)
                document_id = document.pk

                def enqueue_document_ocr():
                    notify_document_changed()
                    if settings.ENABLE_GPU_WORKER_AUTOSTART:
                        ensure_gpu_worker_running("worker_document")
                    dispatch_ocr_pages_task.delay(document_id)

                transaction.on_commit(enqueue_document_ocr)
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

    # get_querysetをオーバーライドしてuserによるfilterを追加する
    def get_queryset(self):
        return Page.objects.filter(doc__owner=self.request.user)


class WordViewSet(viewsets.ModelViewSet):
    queryset = Word.objects.all()
    serializer_class = WordSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["page", "page__doc"]

    # get_querysetをオーバーライドしてuserによるfilterを追加する
    def get_queryset(self):
        return Word.objects.filter(page__doc__owner=self.request.user)

    @action(
        detail=False,
        methods=["post"],
        url_path="ocr",
        permission_classes=[IsAuthenticated, DjangoModelPermissions],
    )
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
        if settings.ENABLE_GPU_WORKER_AUTOSTART:
            ensure_gpu_worker_running("worker_preview_word")
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
