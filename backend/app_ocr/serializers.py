import secrets
from uuid import uuid4
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model, password_validation
from django.contrib.auth.models import Group
from rest_framework import serializers

from app_ocr.input_constraints import (
    ALLOWED_UPLOAD_FILE_EXTENSIONS,
    MAX_UPLOAD_FILE_NAME_LENGTH,
    MAX_UPLOAD_FILE_SIZE,
    UPLOAD_FILE_EXTENSION_ALIASES,
)
from app_ocr.models import Document, Page, State, Word


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ["id", "email"]


class UserCreateSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=["guest", "registered"])
    email = serializers.EmailField(required=False)
    password = serializers.CharField(required=False, write_only=True)

    def validate(self, attrs):
        if attrs["type"] != "registered":
            return attrs

        email = attrs.get("email")
        password = attrs.get("password")
        user_model = get_user_model()

        if not email:
            raise serializers.ValidationError({"email": "この項目は必須です。"})
        if not password:
            raise serializers.ValidationError({"password": "この項目は必須です。"})
        if user_model.objects.filter(email=email).exists():
            raise serializers.ValidationError(
                {"email": "このメールアドレスは既に使われています。"}
            )

        password_validation.validate_password(password)
        return attrs

    def create(self, validated_data):
        user_model = get_user_model()

        if validated_data["type"] == "guest":
            user = user_model.objects.create_user(
                password=secrets.token_urlsafe(32),
                email=f"guest_{uuid4().hex}@example.invalid",
            )
            guest_group = Group.objects.get(name="guest")
            user.groups.add(guest_group)
            return user

        return user_model.objects.create_user(
            password=validated_data["password"],
            email=validated_data["email"],
        )


class UserPasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = self.context["request"].user
        current_password = attrs.get("current_password")
        new_password = attrs.get("new_password")

        if not user.check_password(current_password):
            raise serializers.ValidationError(
                {"current_password": "現在のパスワードが一致しません。"}
            )

        password_validation.validate_password(new_password, user=user)
        return attrs


class DocumentSerializer(serializers.ModelSerializer):
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


class PageSerializer(serializers.ModelSerializer):
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


class WordSerializer(serializers.ModelSerializer):
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


class PreviewWordOcrRequestSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(choices=["replace_words", "rewrite_content"])
    preview_id = serializers.CharField()
    doc = serializers.IntegerField()
    page_number = serializers.IntegerField(min_value=1)
    bbox = serializers.ListField()


class PreviewWordOcrJobResultSerializer(serializers.Serializer):
    state = serializers.ChoiceField(choices=State.choices, default=State.QUEUED)
    mode = serializers.ChoiceField(
        choices=["replace_words", "rewrite_content"],
        required=False,
    )
    preview_id = serializers.CharField(required=False)
    words = serializers.ListField(required=False)
    content = serializers.CharField(required=False)
    error_message = serializers.CharField(required=False)
    direction = serializers.CharField(required=False)
    # words/contentのrequiredはmodeにより変動するが、
    # 直でrequiredを変動することは不可能であるため、
    # if文等で制限を設けたい場合はValidationErrorを追加定義することが有効。
