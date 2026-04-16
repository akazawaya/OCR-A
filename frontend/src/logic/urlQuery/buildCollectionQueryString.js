import { defaultSearchQuery } from "./searchQueryUtils";

const applyKeyValueQuery = (params, query = {}) => {
  if (!query || typeof query !== "object") return;

  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  }
};

const normalizeSearchQuery = (searchQuery = {}) => ({
  ...defaultSearchQuery,
  ...searchQuery,
  keyword: searchQuery?.keyword?.trim?.() ?? "",
});

const isEmptySearchQuery = (searchQuery = {}) =>
  normalizeSearchQuery(searchQuery).keyword === "";

export function buildCollectionQueryString({
  baseQueryString = "",
  routingQuery = {},
  searchQuery = {},
  sortQuery = {},
} = {}) {
  const params = new URLSearchParams(baseQueryString || "");

  applyKeyValueQuery(params, routingQuery);
  applyKeyValueQuery(params, sortQuery);

  if (isEmptySearchQuery(searchQuery)) {
    params.delete("keyword");
    params.delete("field_name");
    params.delete("lookup_expr");
    params.delete("keyword_operator");
  } else {
    const normalizedSearchQuery = normalizeSearchQuery(searchQuery);
    params.set("keyword", normalizedSearchQuery.keyword);
    params.set("field_name", normalizedSearchQuery.fieldName);
    params.set("lookup_expr", normalizedSearchQuery.lookupExpr);
    params.set("keyword_operator", normalizedSearchQuery.keywordOperator);
  }

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
