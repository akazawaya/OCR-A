import pytest
from django.urls import reverse

pytestmark = pytest.mark.django_db


def list_ids(data):
    return [item["id"] for item in data]


@pytest.fixture
def search_test_data(
    authenticated_client,
    document_factory,
    page_factory,
    word_factory,
):
    def create_document_with_words(file_name, words):
        document = document_factory(
            owner=authenticated_client.user,
            file_name=file_name,
        )
        page = page_factory(doc=document)

        word_objects = [word_factory(page=page, content=content) for content in words]

        return {
            "document": document,
            "page": page,
            "words": word_objects,
        }

    doc_apple_multiple_word_hits = create_document_with_words(
        file_name="test.pdf",
        words=["apple", "apple pie", "apple"],
    )

    doc_banana_in_file_name_only = create_document_with_words(
        file_name="banana.pdf",
        words=["orange", "grape"],
    )

    doc_banana_in_word_content_only = create_document_with_words(
        file_name="test.pdf",
        words=["banana", "melon"],
    )

    doc_banana_in_both = create_document_with_words(
        file_name="banana.pdf",
        words=["apple", "banana", "apple banana"],
    )

    doc_banana_in_neither = create_document_with_words(
        file_name="test.pdf",
        words=["tomato", "potato"],
    )

    return {
        "doc_apple_multiple_word_hits": doc_apple_multiple_word_hits,
        "doc_banana_in_file_name_only": doc_banana_in_file_name_only,
        "doc_banana_in_word_content_only": doc_banana_in_word_content_only,
        "doc_banana_in_both": doc_banana_in_both,
        "doc_banana_in_neither": doc_banana_in_neither,
    }


# 重複idのピックアップ排除
def test_search_distinct(authenticated_client, search_test_data):
    response = authenticated_client.get(
        reverse("document-list"),
        {
            "keyword": "apple",
            "field_name": "pages__words__content",
            "lookup_expr": "icontains",
        },
    )

    assert response.status_code == 200

    result_ids = list_ids(response.data["results"])
    expected_id = search_test_data["doc_apple_multiple_word_hits"]["document"].id

    assert result_ids.count(expected_id) == 1


# 検索対象 file_name / pages__words__content / both の切り替え
@pytest.mark.parametrize(
    "field_name, expected_keys",
    [
        ("file_name", ["doc_banana_in_file_name_only", "doc_banana_in_both"]),
        (
            "pages__words__content",
            ["doc_banana_in_word_content_only", "doc_banana_in_both"],
        ),
        (
            "both",
            [
                "doc_banana_in_file_name_only",
                "doc_banana_in_word_content_only",
                "doc_banana_in_both",
            ],
        ),
    ],
)
def test_search_by_field_name(
    authenticated_client,
    search_test_data,
    field_name,
    expected_keys,
):
    response = authenticated_client.get(
        reverse("document-list"),
        {
            "keyword": "banana",
            "field_name": field_name,
            "lookup_expr": "icontains",
        },
    )

    assert response.status_code == 200

    result_ids = set(list_ids(response.data["results"]))
    expected_ids = {search_test_data[key]["document"].id for key in expected_keys}

    assert result_ids == expected_ids


# 単一キーワードの exact / icontains
@pytest.mark.parametrize(
    "keyword, lookup_expr, expected_keys",
    [
        ("apple", "exact", ["doc_apple_multiple_word_hits", "doc_banana_in_both"]),
        ("apple", "icontains", ["doc_apple_multiple_word_hits", "doc_banana_in_both"]),
        ("banana", "exact", ["doc_banana_in_word_content_only", "doc_banana_in_both"]),
        (
            "banana",
            "icontains",
            [
                "doc_banana_in_file_name_only",
                "doc_banana_in_word_content_only",
                "doc_banana_in_both",
            ],
        ),
    ],
)
def test_search_by_lookup_expr(
    authenticated_client,
    search_test_data,
    keyword,
    lookup_expr,
    expected_keys,
):
    response = authenticated_client.get(
        reverse("document-list"),
        {
            "keyword": keyword,
            "field_name": "both",
            "lookup_expr": lookup_expr,
        },
    )

    assert response.status_code == 200

    result_ids = set(list_ids(response.data["results"]))
    expected_ids = {search_test_data[key]["document"].id for key in expected_keys}

    assert result_ids == expected_ids


# 複数キーワードの and / or
# lookup_exprはexactに固定(深い理由はない)
@pytest.mark.parametrize(
    "keyword, keyword_operator, expected_keys",
    [
        ("apple banana", "and", ["doc_banana_in_both"]),
        (
            "apple banana",
            "or",
            [
                "doc_apple_multiple_word_hits",
                "doc_banana_in_word_content_only",
                "doc_banana_in_both",
            ],
        ),
    ],
)
def test_search_by_keyword_operator(
    authenticated_client,
    search_test_data,
    keyword,
    keyword_operator,
    expected_keys,
):
    response = authenticated_client.get(
        reverse("document-list"),
        {
            "keyword": keyword,
            "field_name": "both",
            "lookup_expr": "exact",
            "keyword_operator": keyword_operator,
        },
    )

    assert response.status_code == 200

    result_ids = set(list_ids(response.data["results"]))
    expected_ids = {search_test_data[key]["document"].id for key in expected_keys}

    assert result_ids == expected_ids


# 単一の検索キーワードでも
# keyword_operator を指定して通常動作する
@pytest.mark.parametrize("keyword_operator", ["and", "or"])
def test_search_allows_keyword_operator_with_single_keyword(
    authenticated_client,
    keyword_operator,
):
    base_response = authenticated_client.get(
        reverse("document-list"),
        {
            "keyword": "banana",
            "field_name": "pages__words__content",
            "lookup_expr": "exact",
        },
    )
    response = authenticated_client.get(
        reverse("document-list"),
        {
            "keyword": "banana",
            "field_name": "pages__words__content",
            "lookup_expr": "exact",
            "keyword_operator": keyword_operator,
        },
    )

    assert base_response.status_code == 200
    assert response.status_code == 200

    base_ids = set(list_ids(base_response.data["results"]))
    result_ids = set(list_ids(response.data["results"]))

    assert result_ids == base_ids


# 完全な仕様外値は 400
@pytest.mark.parametrize(
    "params",
    [
        {
            "keyword": "banana",
            "field_name": "invalid",
            "lookup_expr": "icontains",
        },
        {
            "keyword": "banana",
            "field_name": "both",
            "lookup_expr": "invalid",
        },
        {
            "keyword": "apple banana",
            "field_name": "both",
            "lookup_expr": "exact",
            "keyword_operator": "invalid",
        },
    ],
)
def test_search_rejects_invalid_params(authenticated_client, params):
    response = authenticated_client.get(reverse("document-list"), params)

    assert response.status_code == 400
