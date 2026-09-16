from django.db.models import Q
from django_filters import rest_framework as filters

from app_ocr.models import Document


# field_name / lookup_expr / keyword_operator は、Document を直接絞り込む項目ではなく、
# keyword 検索の方法を指定するための補助パラメータである。
# 既存の filter() は、渡された value ごとに queryset を絞り込もうとするため、
# 今回の用途には合わない。
# よって、これらのパラメータは ChoiceFilter として choices による入力値の検証だけ行い、
# filter() は queryset に対して余計な処理を行わないようオーバーライドする。
# 実際の絞り込み処理は keyword の custom filter メソッドに集約する。
class ParamChoiceFilter(filters.ChoiceFilter):
    def filter(self, queryset, value):
        return queryset


class DocumentFilterSet(filters.FilterSet):
    keyword = filters.CharFilter(method="filter_by_keyword")
    field_name = ParamChoiceFilter(
        choices=[
            ("file_name", "file_name"),
            ("pages__words__content", "pages__words__content"),
            ("both", "both"),
        ],
        required=False,
    )
    lookup_expr = ParamChoiceFilter(
        choices=[
            ("exact", "exact"),
            ("icontains", "icontains"),
        ],
        required=False,
    )
    keyword_operator = ParamChoiceFilter(
        choices=[
            ("and", "and"),
            ("or", "or"),
        ],
        required=False,
    )

    class Meta:
        model = Document
        fields = []

    def filter_by_keyword(self, queryset, name, value):
        field_name = self.form.cleaned_data.get("field_name") or "both"
        lookup_expr = self.form.cleaned_data.get("lookup_expr") or "icontains"
        keyword_operator = self.form.cleaned_data.get("keyword_operator") or "or"

        keywords = value.split()
        if not keywords:
            return queryset

        if field_name == "both":
            target_fields = ["file_name", "pages__words__content"]
        else:
            target_fields = [field_name]

        keyword_queries = []
        for keyword in keywords:
            field_query = Q()
            # field_name == bothの時,1つの keyword に対して、
            # どちらの target_fields に一致してもよいので、|= でOR結合する
            for target_field in target_fields:
                field_query |= Q(**{f"{target_field}__{lookup_expr}": keyword})
            keyword_queries.append(field_query)

        if keyword_operator == "and":
            # related field (pages__words__content) に対し &= 条件を1本のQにまとめると、
            # ORMは「同じ related row（1行）」で全条件を満たすことを要求する。
            # しかし実際は、keyword が別々の related row に分かれて存在することがある。
            # （例：apple は row1、banana は row2）
            # この場合、どの1行も両方の条件を同時には満たせないため、
            # AND 条件ではヒットしなくなってしまう。

            # よって、ここでは keyword ごとに一致する Document のID集合を作り、
            # その積集合を取ることで AND 条件を表現する。
            base_queryset = queryset
            for field_query in keyword_queries:
                matched_ids = base_queryset.filter(field_query).values("pk")
                queryset = queryset.filter(pk__in=matched_ids)
            return queryset.distinct()

        # keyword_operator == "or"
        combined_query = keyword_queries[0]
        for query in keyword_queries[1:]:
            combined_query |= query

        return queryset.filter(combined_query).distinct()
