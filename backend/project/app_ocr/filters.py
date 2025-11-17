import django_filters
from .models import Document


class DocumentFilter(django_filters.FilterSet):
    # メタクラス（クラスを作成するクラス）がクラス定義時に読み取る情報を追加するためにclass Metaを定義
    # Djangoがメタクラスを使うのはクラス定義の瞬間にモデルの情報（フィールド定義やMeta設定）を読み取り、自動で内部構造を構築するため
    # DjangoのORMの__とクエリパラメータの区切り文字__が被っているのと
    # lookupのexactがデフォで省略されるのを処理できないので
    # 泣く泣く平書きでフィルタを定義する

    file_name__exact = django_filters.CharFilter(
        field_name="file_name",
        lookup_expr="exact",
    )

    file_name__icontains = django_filters.CharFilter(
        field_name="file_name",
        lookup_expr="icontains",
    )

    pages__words__content__exact = django_filters.CharFilter(
        field_name="pages__words__content",
        lookup_expr="exact",
    )
    pages__words__content__icontains = django_filters.CharFilter(
        field_name="pages__words__content",
        lookup_expr="icontains",
    )

