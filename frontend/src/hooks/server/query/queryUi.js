export function buildSearch({ baseSearch = "", routing = {}, conditions = [] } = {}) {
  const params = new URLSearchParams(baseSearch || "");

  // 前半：routingに関わる表示IDの絞り込み
  if (routing && typeof routing === "object") {
    for (const [key, value] of Object.entries(routing)) {
      if (value === null || value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
    }
  }

  // 後半：検索フォーム由来の条件
  // conditionsは将来の拡張として配列だが、現仕様では先頭1件のみ適用
  const c = conditions[0];
  if (c) {
    const key = c.lookup === "exact" ? c.fieldName : `${c.fieldName}__${c.lookup}`;
    const value = c.value;
    if (value === null || value === undefined || value === "") params.delete(key);
    else params.set(key, String(value));
  }

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
