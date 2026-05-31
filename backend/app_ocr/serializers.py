from zoneinfo import ZoneInfo

from django.contrib.auth.models import User
from rest_framework import serializers

from app_ocr.input_constraints import (
    ALLOWED_UPLOAD_FILE_EXTENSIONS,
    MAX_UPLOAD_FILE_NAME_LENGTH,
    MAX_UPLOAD_FILE_SIZE,
    UPLOAD_FILE_EXTENSION_ALIASES,
)
from app_ocr.models import Document, Page, Word


class UserSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = User
        fields = ["id", "url", "username"]


class DocumentSerializer(serializers.HyperlinkedModelSerializer):
    state = serializers.CharField(source="get_state_display", read_only=True)
    created = serializers.DateTimeField(
        format="%Y/%m/%d %H:%M:%S",
        default_timezone=ZoneInfo("Asia/Tokyo"),
        read_only=True,
    )

    def create(self, validated_data):
        # file の保存先を doc.id ベースとするため、
        # 先に Document を保存して id を確定させてから file を保存する
        uploaded_file = validated_data.pop("file")
        document = Document.objects.create(**validated_data)
        document.file.save(uploaded_file.name, uploaded_file, save=True)
        return document

    class Meta:
        model = Document
        fields = [
            "id",
            "state",
            "created",
            "file",
            "file_name",
            "file_type",
            "total_pages",
        ]


class DocumentUploadSerializer(serializers.Serializer):
    file = serializers.FileField(allow_empty_file=False)

    # FileFieldはデフォルトのallow_empty_file=Falseにより
    # サイズ0のファイルを検知してバリデーションエラーとして拒否できる
    # 「添付ファイルの中身が空でした。」が返る
    def validate_file(self, file):
        ext = file.name.rsplit(".", 1)[-1].lower() if "." in file.name else ""
        ext = UPLOAD_FILE_EXTENSION_ALIASES.get(ext, ext)
        if ext not in ALLOWED_UPLOAD_FILE_EXTENSIONS:
            raise serializers.ValidationError(
                "拡張子が非対応です。",
                code="unsupported_extension",
            )
        if file.size > MAX_UPLOAD_FILE_SIZE:
            raise serializers.ValidationError(
                "ファイルサイズが大きすぎます。",
                code="file_too_large",
            )
        if len(file.name) > MAX_UPLOAD_FILE_NAME_LENGTH:
            raise serializers.ValidationError(
                "ファイル名が長すぎます。",
                code="file_name_too_long",
            )
        return file


class PageSerializer(serializers.HyperlinkedModelSerializer):
    doc = serializers.PrimaryKeyRelatedField(queryset=Document.objects.all())

    class Meta:
        model = Page
        fields = [
            "id",
            "doc",
            "image",
            "state",
            "page_number",
            "width_px",
            "height_px",
        ]


class WordSerializer(serializers.HyperlinkedModelSerializer):
    page = serializers.PrimaryKeyRelatedField(queryset=Page.objects.all())
    page__page_number = serializers.IntegerField(
        source="page.page_number", read_only=True
    )
    # pageは純粋なページ数ではなく、外部キーであることに注意
    # 純粋なページ数はpage__page_numberにて実装

    class Meta:
        model = Word
        fields = [
            "id",
            "page",
            "bbox",
            "content",
            "direction",
            "rec_score",
            "det_score",
            "page__page_number",
        ]


class WordOcrPreviewRequestSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(choices=["replace_words", "rewrite_content"])
    preview_id = serializers.CharField()
    doc = serializers.IntegerField()
    page_number = serializers.IntegerField(min_value=1)
    bbox = serializers.ListField()
