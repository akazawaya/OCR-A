import { useState } from "react";

import { searchOptionDefs } from "../../logic/urlQuery/searchQueryUtils";

export default function DocumentToolbar({
  data: { draftSearchQuery = {} } = {},
  events: {
    onClickSearchButton,
    onChangeSearchInput,
    onClickResetSearchButton,
    onClickAnalyzeButton,
  } = {},
}) {
  const [selectedFile, setSelectedFile] = useState(null);

  const findOptionLabel = (queryKey, value) =>
    searchOptionDefs[queryKey].find((option) => option.value === value)
      ?.label ?? "";

  const currentSearchSummary = draftSearchQuery.keyword
    ? `現在の検索条件: 「${draftSearchQuery.keyword}」 / ${findOptionLabel("fieldName", draftSearchQuery.fieldName)} / ${findOptionLabel("lookupExpr", draftSearchQuery.lookupExpr)} / ${findOptionLabel("keywordOperator", draftSearchQuery.keywordOperator)}`
    : "現在の検索条件: なし";

  const renderRadioSection = (queryKey, sectionLabel) => (
    <div className="flex flex-col gap-2 rounded border border-gray-300 p-3">
      <p className="text-sm font-bold text-gray-700">{sectionLabel}</p>

      <div className="flex flex-col gap-2">
        {searchOptionDefs[queryKey].map((option) => (
          <label className="flex items-center gap-2" key={option.value}>
            <input
              checked={draftSearchQuery[queryKey] === option.value}
              name={queryKey}
              onChange={(e) => onChangeSearchInput(queryKey, e.target.value)}
              type="radio"
              value={option.value}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="mx-auto flex w-fit flex-col rounded-md border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <input
          className="hidden"
          id="document-file-input"
          onChange={(e) => setSelectedFile(e.target.files[0])}
          type="file"
        />
        <label
          className="flex min-h-24 w-64 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-center hover:border-indigo-500 hover:bg-indigo-50"
          htmlFor="document-file-input"
        >
          {!selectedFile ? (
            <>
              <span className="font-medium text-gray-700">ファイルを選択</span>
              <span className="text-sm text-gray-500">
                またはここにドラッグ＆ドロップ
              </span>
            </>
          ) : (
            <span className="mt-1 max-w-full text-sm font-semibold break-all text-gray-800">
              {selectedFile.name}
            </span>
          )}
        </label>
        <button
          className="w-fit rounded-md bg-indigo-500 p-2 text-white enabled:cursor-pointer enabled:hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-gray-400"
          disabled={!selectedFile}
          onClick={() => onClickAnalyzeButton(selectedFile)}
        >
          OCR実行
        </button>
      </div>
      <details className="flex flex-col items-center">
        <summary className="w-fit cursor-pointer list-none rounded-md bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600">
          検索メニュー
        </summary>

        <div className="mt-2 flex flex-col items-center gap-2">
          <div className="flex items-center">
            <input
              className="w-fit rounded border border-gray-300 bg-gray-100 p-2 text-left leading-2 text-gray-700 transition-colors duration-200 outline-none focus:border-indigo-500 focus:bg-transparent focus:ring-2 focus:ring-indigo-200"
              onChange={(e) => onChangeSearchInput("keyword", e.target.value)}
              type="text"
              value={draftSearchQuery.keyword}
            />
            <button
              className="ml-1 w-fit cursor-pointer rounded-md bg-indigo-500 px-3 py-2 text-white hover:bg-indigo-600"
              onClick={onClickSearchButton}
            >
              検索
            </button>
            <button
              className="ml-1 w-fit cursor-pointer rounded-md bg-indigo-500 px-3 py-2 text-white hover:bg-indigo-600"
              onClick={onClickResetSearchButton}
            >
              リセット
            </button>
          </div>
          <div className="flex gap-1">
            {renderRadioSection("fieldName", "フィールド名")}
            {renderRadioSection("lookupExpr", "検索条件")}
            {renderRadioSection("keywordOperator", "演算子")}
          </div>
          <p>{currentSearchSummary}</p>
        </div>
      </details>
    </div>
  );
}
