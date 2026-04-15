export function buildCollectionQueryString({
  baseQueryString = "",
  routingQuery = {},
  searchQuery = null,
} = {}) {
  const params = new URLSearchParams(baseQueryString || "");

  if (routingQuery && typeof routingQuery === "object") {
    for (const [key, value] of Object.entries(routingQuery)) {
      if (value === null || value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    }
  }

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
