from rest_framework import serializers
from app_ocr.models import Document, Page, Word
from django.contrib.auth.models import User
from zoneinfo import ZoneInfo


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


class PageSerializer(serializers.HyperlinkedModelSerializer):
    doc = serializers.PrimaryKeyRelatedField(
        queryset=Document.objects.all()
    )  # これがないとIDの保存時にURL形式を求めてくる

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
            "rec_score",
            "det_score",
            "page__page_number",
        ]
