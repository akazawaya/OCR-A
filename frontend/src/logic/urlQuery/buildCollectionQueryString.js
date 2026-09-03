import { defaultSearchQuery } from "./searchQueryUtils";

const applyKeyValueQuery = (params, query = {}) => {
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  }
};

const normalizeSearchQuery = (searchQuery = defaultSearchQuery) => {
  const mergedSearchQuery = {
    ...defaultSearchQuery,
    ...searchQuery,
  };

  return {
    ...mergedSearchQuery,
    keyword: mergedSearchQuery.keyword.trim(),
  };
};

export const buildCollectionQueryString = ({
  baseQueryString = "",
  paginationQuery = {},
  routingQuery = {},
  searchQuery = defaultSearchQuery,
  sortQuery = {},
} = {}) => {
  const params = new URLSearchParams(baseQueryString);

  applyKeyValueQuery(params, routingQuery);
  applyKeyValueQuery(params, paginationQuery);
  applyKeyValueQuery(params, sortQuery);

  const normalizedSearchQuery = normalizeSearchQuery(searchQuery);

  if (normalizedSearchQuery.keyword === "") {
    params.delete("keyword");
    params.delete("field_name");
    params.delete("lookup_expr");
    params.delete("keyword_operator");
  } else {
    params.set("keyword", normalizedSearchQuery.keyword);
    params.set("field_name", normalizedSearchQuery.fieldName);
    params.set("lookup_expr", normalizedSearchQuery.lookupExpr);
    params.set("keyword_operator", normalizedSearchQuery.keywordOperator);
  }

  const qs = params.toString();
  return qs ? `?${qs}` : "";
};
