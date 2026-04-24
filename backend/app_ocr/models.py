import shutil
from pathlib import Path

from django.core.files.storage import FileSystemStorage
from django.core.validators import (
    FileExtensionValidator,
    MaxValueValidator,
    MinValueValidator,
)
from django.db import models

from app_ocr.input_constraints import ALLOWED_UPLOAD_FILE_EXTENSIONS


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


# Userモデルはdjango.contrib.auth.modelsから自動で作成される


# 直書きだと path が import 時に固定文字列として評価されるため、関数で定義する
def build_document_storage_prefix(doc_id):
    return f"input/doc-{doc_id}/"


def document_file_upload_to(instance, filename):
    return f"{build_document_storage_prefix(instance.id)}document/{filename}"


def page_image_upload_to(instance, filename):
    return f"{build_document_storage_prefix(instance.doc_id)}pages/{filename}"


def delete_document_files(document, prefix):
    storage = document.file.storage

    if isinstance(storage, FileSystemStorage):
        root_path = Path(storage.location) / prefix
        if root_path.exists():
            shutil.rmtree(root_path)
        return

    raise NotImplementedError("This storage backend is not supported yet.")


class Document(models.Model):
    id = models.BigAutoField(primary_key=True)

    # Document.deleteの実行時、保存ファイルも削除するためのオーバーライド
    # DRFの削除デフォルトは instance.delete() 経由のため、通常のAPIではこれを通る。
    # QuerySet.delete() はこのオーバーライドを通らないため注意。
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
    file_name = models.CharField(max_length=255)
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
