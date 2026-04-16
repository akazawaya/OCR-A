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

export function buildCollectionQueryString({
  baseQueryString = "",
  routingQuery = {},
  searchQuery = {},
  sortQuery = {},
} = {}) {
  const params = new URLSearchParams(baseQueryString || "");

  applyKeyValueQuery(params, routingQuery);
  applyKeyValueQuery(params, sortQuery);

  const keyword = searchQuery?.keyword?.trim() || "";

  if (!keyword) {
    params.delete("keyword");
    params.delete("field_name");
    params.delete("lookup_expr");
    params.delete("keyword_operator");
  } else {
    params.set("keyword", keyword);
    params.set("field_name", searchQuery.fieldName);
    params.set("lookup_expr", searchQuery.lookupExpr);
    params.set("keyword_operator", searchQuery.keywordOperator);
  }

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
