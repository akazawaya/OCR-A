import django_filters
from .models import Document

class DocumentFilter(django_filters.FilterSet):
    # メタクラス（クラスを作成するクラス）がクラス定義時に読み取る情報を追加するためにclass Metaを定義
    # Djangoがメタクラスを使うのはクラス定義の瞬間にモデルの情報（フィールド定義やMeta設定）を読み取り、自動で内部構造を構築するため
    class Meta:
        model = Document
        fields = {
            "file_name": ["exact", "icontains"],
            "pages__words__content": ["exact", "icontains"],}
