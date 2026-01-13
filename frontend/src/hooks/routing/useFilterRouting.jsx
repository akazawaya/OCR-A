export const useFilterRouting = (search, searchFilter) => {
  const applySearchFilter = (conditions = []) => {
    const queryParams = new URLSearchParams(search); // URLSearchParamsを使うとエンコードや&=の取付を自動化してくれるらしい
    const c = conditions[0]; // condition配列の最初のみを暫定的に対象とする

    if (!c) return;

    const key = c.lookup === "exact" ? c.fieldName: `${c.fieldName}__${c.lookup}`;
    if (c.value) {
      queryParams.set(key, c.value);
    } else {
      queryParams.delete(key);
    }

    const nextQueryString = queryParams.toString();
    const nextSearch = nextQueryString ? `?${nextQueryString}` : "";
    // ここで location.search が変わる → DocumentsPage で searchDataUrl 更新
    searchFilter?.(nextSearch); // ← 暫定的にPageに次のsearchだけ渡す
  };

  return { applySearchFilter };
};
