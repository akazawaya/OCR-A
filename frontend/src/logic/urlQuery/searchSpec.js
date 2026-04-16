export const defaultSearchQuery = Object.freeze({
  keyword: "",
  fieldName: "both",
  lookupExpr: "icontains",
  keywordOperator: "or",
});

export const searchOptionDefs = Object.freeze({
  fieldName: [
    { value: "file_name", label: "ファイル名" },
    { value: "pages__words__content", label: "OCR文字" },
    { value: "both", label: "両方" },
  ],
  lookupExpr: [
    { value: "exact", label: "完全一致" },
    { value: "icontains", label: "部分一致" },
  ],
  keywordOperator: [
    { value: "and", label: "AND" },
    { value: "or", label: "OR" },
  ],
});
