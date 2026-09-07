import secrets

from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import Group, PermissionsMixin
from django.core.validators import (
    FileExtensionValidator,
    MaxValueValidator,
    MinValueValidator,
)
from django.db import models

from app_ocr.input_constraints import (
    ALLOWED_UPLOAD_FILE_EXTENSIONS,
    MAX_UPLOAD_FILE_NAME_LENGTH,
)
from app_ocr.storage import (
    build_document_storage_prefix,
    delete_document_files,
    document_file_upload_to,
    page_image_upload_to,
)


class FileType(models.IntegerChoices):
    # name, value, label で各要素にアクセス可能
    JPG = 1, "jpg"
    PNG = 2, "png"
    PDF = 3, "pdf"

    @classmethod
    def label_to_value(cls, ext_label):
        for ext in cls:
            if ext.label == ext_label:
                return ext.value


class Direction(models.IntegerChoices):
    HORIZONTAL = 1, "horizontal"
    VERTICAL = 2, "vertical"

    @classmethod
    def label_to_value(cls, ext_label):
        for ext in cls:
            if ext.label == ext_label:
                return ext.value


class State(models.IntegerChoices):
    QUEUED = 1, "待機中"
    PROCESSING = 2, "処理中"
    SUCCESS = 3, "完了"
    FAILED = 4, "失敗"

    @classmethod
    def label_to_value(cls, ext_label):
        for ext in cls:
            if ext.label == ext_label:
                return ext.value


def delete_files_for_documents(documents):
    for document in list(documents):
        prefix = build_document_storage_prefix(document.id)
        delete_document_files(document, prefix)


# adminでのUser消去時(QuerySet.delete())のdocument.fileの削除
class UserQuerySet(models.QuerySet):
    def delete(self):
        documents = Document.objects.using(self.db).filter(owner__in=self)
        delete_files_for_documents(documents)
        return super().delete()

    delete.alters_data = True
    delete.queryset_only = True


class UserManager(BaseUserManager.from_queryset(UserQuerySet)):
    use_in_migrations = True

    def _create_user(self, email, password, group_name, **extra_fields):
        group = Group.objects.using(self._db).get(name=group_name)
        email = self.normalize_email(email)
        user = self.model(
            email=email,
            group=group,
            **extra_fields,
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_registered_user(self, email, password, **extra_fields):
        return self._create_user(
            email,
            password,
            "standard_group",
            **extra_fields,
        )

    # DjangoのカスタムUserManagerで推奨される標準インターフェースとして、
    # create_userとcreate_superuserの定義の必要性がある。
    # create_userは不要で、どこからも参照されないと思われるが公式に従い定義を残す。
    # https://docs.djangoproject.com/en/5.2/topics/auth/customizing/#writing-a-manager-for-a-custom-user-model
    def create_user(self, email, password, **extra_fields):
        return self.create_registered_user(email, password, **extra_fields)

    def create_guest_user(self, email, **extra_fields):
        return self._create_user(
            email,
            secrets.token_urlsafe(32),
            "guest_group",
            **extra_fields,
        )

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self._create_user(
            email,
            password,
            "staff_group",
            **extra_fields,
        )


class User(AbstractBaseUser, PermissionsMixin):
    # 1 User・1 Groupを非NULLのForeignKeyで保証する。
    # PermissionsMixinの標準M2Mフィールドは使用せず、Permissionはgroup経由でのみ取得。
    groups = None

    email = models.EmailField(unique=True)
    group = models.ForeignKey(
        Group,
        on_delete=models.PROTECT,
        related_name="users",
    )
    is_staff = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    # User.delete時のdocument.fileの削除
    # CASCADE時の削除ロジックのCollecterはオーバーライド介入が想定されていないため、
    # delete_files_for_documents関数を伴うようにして削除する
    def delete(self, *args, **kwargs):
        delete_files_for_documents(self.documents.all())
        return super().delete(*args, **kwargs)

    def __str__(self):
        return self.email


# adminでのDocument消去時(QuerySet.delete())のdocument.fileの削除
class DocumentQuerySet(models.QuerySet):
    def delete(self):
        delete_files_for_documents(self)
        return super().delete()

    delete.alters_data = True
    delete.queryset_only = True


class Document(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    id = models.BigAutoField(primary_key=True)

    objects = DocumentQuerySet.as_manager()

    # Document.deleteの実行時、保存ファイルも削除するためのオーバーライド
    # DRFの削除デフォルトは instance.delete() 経由のため、通常のAPIではこれを通る。
    def delete(self, *args, **kwargs):
        prefix = build_document_storage_prefix(self.id)
        delete_document_files(self, prefix)
        return super().delete(*args, **kwargs)

    created = models.DateTimeField(auto_now_add=True)
    state = models.PositiveSmallIntegerField(
        choices=State.choices, default=State.QUEUED
    )
    file = models.FileField(
        upload_to=document_file_upload_to,
        validators=[
            FileExtensionValidator(
                allowed_extensions=sorted(ALLOWED_UPLOAD_FILE_EXTENSIONS)
            )
        ],
    )
    file_name = models.CharField(max_length=MAX_UPLOAD_FILE_NAME_LENGTH)
    file_type = models.PositiveSmallIntegerField(choices=FileType.choices)
    total_pages = models.PositiveSmallIntegerField(default=1)

    class Meta:
        ordering = ["created"]


class Page(models.Model):
    doc = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="pages")
    image = models.ImageField(
        upload_to=page_image_upload_to,
        null=True,
        blank=True,
        width_field="width_px",
        height_field="height_px",
    )  # 自動でwhを取得できるらしい
    state = models.PositiveSmallIntegerField(
        choices=State.choices, default=State.QUEUED
    )
    page_number = models.PositiveSmallIntegerField(
        default=1, validators=[MinValueValidator(1)]
    )
    width_px = models.PositiveIntegerField(null=True, blank=True)
    height_px = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        ordering = ["page_number"]


class Word(models.Model):
    page = models.ForeignKey(Page, on_delete=models.CASCADE, related_name="words")
    bbox = models.JSONField()
    content = models.TextField(blank=True, null=True)
    direction = models.PositiveSmallIntegerField(choices=Direction.choices)
    rec_score = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
    )
    det_score = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
    )
