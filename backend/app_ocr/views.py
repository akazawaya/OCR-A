from functools import partial

from celery import states as celery_states
from django.conf import settings
from django.contrib.auth import (
    authenticate,
    get_user_model,
    login,
    logout,
    update_session_auth_hash,
)
from django.db import transaction
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from app_ocr.etc.tools import inspect_file
from app_ocr.filters import DocumentFilterSet
from app_ocr.models import Document, FileType, Page, State, Word
from app_ocr.permissions import CanRunDocumentOcr, CanRunWordOcr
from app_ocr.serializers import (
    DocumentSerializer,
    DocumentUploadSerializer,
    PageSerializer,
    PreviewWordOcrJobResultSerializer,
    PreviewWordOcrRequestSerializer,
    UserCreateSerializer,
    UserPasswordChangeSerializer,
    UserSerializer,
    WordSerializer,
)
from app_ocr.service.document import create_pages_from_document_file
from app_ocr.storage import (
    build_document_storage_prefix,
    delete_document_files,
)
from app_ocr.tasks import (
    dispatch_ocr_pages_task,
    notify_document_changed,
    ocr_word_task,
    request_gpu_worker_start,
)

User = get_user_model()

# Celeryの状態名をmodelsでのstateに変換する辞書
CELERY_TO_OCR_STATE = {
    celery_states.PENDING: State.QUEUED,
    celery_states.STARTED: State.PROCESSING,
    celery_states.SUCCESS: State.SUCCESS,
    celery_states.FAILURE: State.FAILED,
}


class UserViewSet(viewsets.GenericViewSet):
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]

        return super().get_permissions()

    @method_decorator(csrf_protect)
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
        logout(request)
        user.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsAuthenticated],
        url_path="me/password",
    )
    def password(self, request):
        if request.user.group.name == "guest_group":
            return Response(status=status.HTTP_403_FORBIDDEN)

        serializer = UserPasswordChangeSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        update_session_auth_hash(request, request.user)

        return Response(status=status.HTTP_204_NO_CONTENT)


class AuthViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    @action(detail=False, methods=["get"])
    @method_decorator(ensure_csrf_cookie)
    def csrf(self, request):
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"])
    def me(self, request):
        user = request.user

        return Response(
            {
                "authenticated": user.is_authenticated,
                "email": user.email if user.is_authenticated else None,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"])
    @method_decorator(csrf_protect)
    def login(self, request):
        email = request.data.get("email")
        password = request.data.get("password")
        user = authenticate(request, email=email, password=password)

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


class DocumentPagination(PageNumberPagination):
    page_size = 10

    def get_paginated_response(self, data):
        return Response(
            {
                "current_page": self.page.number,
                "pagination_total_pages": self.page.paginator.num_pages,
                "results": data,
            }
        )


class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    pagination_class = DocumentPagination
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
                notify_document_changed_callback = partial(
                    notify_document_changed, document.owner_id
                )
                transaction.on_commit(notify_document_changed_callback)
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
        permission_classes=[IsAuthenticated, CanRunDocumentOcr],
    )
    def ocr(self, request):
        file = request.FILES.get("file")
        serializer = self.build_document_serializer_from_file(file)
        document = None
        try:
            with transaction.atomic():
                document = serializer.save(owner=self.request.user)

                def enqueue_document_ocr():
                    notify_document_changed(document.owner_id)
                    if settings.ENABLE_GPU_WORKER_AUTOSTART:
                        request_gpu_worker_start.delay("ocr_document_queue")
                    dispatch_ocr_pages_task.delay(document.pk)

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
    serializer_class = PageSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["doc"]

    # get_querysetをオーバーライドしてuserによるfilterを追加する
    def get_queryset(self):
        return Page.objects.filter(doc__owner=self.request.user)


class WordViewSet(viewsets.ModelViewSet):
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
        permission_classes=[IsAuthenticated, CanRunWordOcr],
    )
    def ocr(self, request):
        serializer = PreviewWordOcrRequestSerializer(
            data=request.data,
            # UserScopedPrimaryKeyRelatedFieldで所有者検証するため、
            # request.userを含むcontextを渡す
            context=self.get_serializer_context(),
        )
        serializer.is_valid(raise_exception=True)
        if settings.ENABLE_GPU_WORKER_AUTOSTART:
            request_gpu_worker_start.delay("ocr_word_queue")
        task_kwargs = {
            **serializer.validated_data,
            "notification_user_id": request.user.pk,
        }
        task_result = ocr_word_task.delay(**task_kwargs)
        return Response(
            {"preview_job_id": task_result.id},
            status=status.HTTP_202_ACCEPTED,
        )

    @action(
        detail=False,
        methods=["get"],
        url_path=r"ocr/(?P<preview_job_id>[^/.]+)",
    )
    def ocr_result(self, request, preview_job_id):
        task_result = ocr_word_task.AsyncResult(preview_job_id)
        result = {
            "state": CELERY_TO_OCR_STATE.get(
                task_result.state,
                State.PROCESSING,
            ),
        }
        if task_result.successful():
            result.update(task_result.result)
        elif task_result.failed():
            result["error_message"] = str(task_result.result)

        serializer = PreviewWordOcrJobResultSerializer(data=result)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)
