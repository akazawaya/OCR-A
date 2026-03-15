from rest_framework import serializers
from app_ocr.models import Document, Page, Word
from django.contrib.auth.models import User
from zoneinfo import ZoneInfo


class UserSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = User
        fields = ["id", "url", "username"]


class DocumentSerializer(serializers.HyperlinkedModelSerializer):
    state_display = serializers.CharField(source="get_state_display", read_only=True)
    file_type_display = serializers.CharField(
        source="get_file_type_display", read_only=True
    )
    created_display = serializers.DateTimeField(
        source="created",
        format="%Y/%m/%d %H:%M:%S",
        default_timezone=ZoneInfo("Asia/Tokyo"),
        read_only=True,
    )

    class Meta:
        model = Document
        fields = [
            "id",
            "state",
            "state_display",
            "created",
            "created_display",
            "file",
            "file_name",
            "file_type",
            "file_type_display",
            "total_pages",
        ]


class PageSerializer(serializers.HyperlinkedModelSerializer):
    state_display = serializers.CharField(source="get_state_display", read_only=True)
    doc = serializers.PrimaryKeyRelatedField(
        queryset=Document.objects.all()
    )  # これがないとID の保存時にURL形式を求めてくる

    class Meta:
        model = Page
        fields = [
            "id",
            "doc",
            "image",
            "state",
            "state_display",
            "page_number",
            "width_px",
            "height_px",
        ]


class WordSerializer(serializers.HyperlinkedModelSerializer):
    direction_display = serializers.CharField(
        source="get_direction_display", read_only=True
    )
    page__page_number = serializers.IntegerField(
        source="page.page_number", read_only=True
    )  # UIでページ番号を有効にするには明示が必要
    page = serializers.PrimaryKeyRelatedField(queryset=Page.objects.all())

    class Meta:
        model = Word
        fields = [
            "id",
            "page",
            "bbox",
            "content",
            "direction",
            "direction_display",
            "rec_score",
            "det_score",
            "page__page_number",
        ]
