import { useRef, useState } from "react";
import { Upload } from "lucide-react";

import { searchOptionDefs } from "../../logic/urlQuery/searchQueryUtils";
import Button from "../ui/Button";

const DocumentToolbar = ({
  data: { draftSearchQuery, appliedSearchQuery, maxUploadFileSizeMb },
  actions: {
    applySearch,
    updateSearchQuery,
    clearSearch,
    postFormDataFile,
  } = {},
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false); // ドラッグ時の見た目反映用
  const fileInputRef = useRef(null);

  const postSelectedFile = (shouldStartOcr) => {
    postFormDataFile(selectedFile, { shouldStartOcr });
    setSelectedFile(null);
    fileInputRef.current.value = "";
  };

  const handleFileDrop = (event) => {
    event.preventDefault();
    setIsDraggingFile(false);

    const [file] = event.dataTransfer.files;
    if (file) {
      setSelectedFile(file);
    }
  };

  const findOptionLabel = (queryKey, value) =>
    searchOptionDefs[queryKey].find((option) => option.value === value).label;

  const currentSearchSummary = appliedSearchQuery.keyword
    ? `現在の検索条件: 「${appliedSearchQuery.keyword}」 / ${findOptionLabel("fieldName", appliedSearchQuery.fieldName)} / ${findOptionLabel("lookupExpr", appliedSearchQuery.lookupExpr)} / ${findOptionLabel("keywordOperator", appliedSearchQuery.keywordOperator)}`
    : "現在の検索条件: なし";

  const renderRadioSection = (queryKey, sectionLabel) => (
    <div className="flex flex-col gap-1 rounded border border-gray-300 p-1">
      <p className="text-sm font-bold text-gray-700">{sectionLabel}</p>

      <div className="flex flex-col">
        {searchOptionDefs[queryKey].map((option) => (
          <label key={option.value} className="flex items-center gap-1 text-sm">
            <input
              checked={draftSearchQuery[queryKey] === option.value}
              name={queryKey}
              type="radio"
              value={option.value}
              onChange={(e) => updateSearchQuery(queryKey, e.target.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="mx-auto flex w-fit flex-col items-center rounded-md border border-gray-400 bg-white p-2">
      <div className="mb-2 flex items-center gap-2">
        <input
          ref={fileInputRef}
          className="hidden"
          id="document-file-input"
          type="file"
          onChange={(e) => setSelectedFile(e.target.files[0])}
        />
        <label
          className={`flex min-h-18 min-w-64 cursor-pointer flex-col justify-center rounded-md border-2 border-dashed px-4 py-3 text-center ${
            isDraggingFile
              ? "border-indigo-500 bg-indigo-50"
              : "border-gray-300 bg-gray-50 hover:border-indigo-500 hover:bg-indigo-50"
          }`}
          htmlFor="document-file-input"
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setIsDraggingFile(false);
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDraggingFile(true);
          }}
          onDrop={handleFileDrop}
        >
          {!selectedFile ? (
            <div className="flex h-full flex-col items-center justify-center">
              <Upload />
              <span className="font-medium text-gray-700">ファイルを選択</span>
              <span className="text-sm text-gray-500">
                またはドラッグ＆ドロップ
              </span>
            </div>
          ) : (
            <span className="mt-1 max-w-full text-sm font-semibold break-all text-gray-800">
              {selectedFile.name}
            </span>
          )}
        </label>

        <div className="flex h-full flex-col items-center justify-center gap-1">
          <Button
            disabled={!selectedFile}
            onClick={() => postSelectedFile(true)}
          >
            保存＆OCR
          </Button>
          <Button
            disabled={!selectedFile}
            onClick={() => postSelectedFile(false)}
          >
            保存のみ
          </Button>
        </div>
      </div>
      <p className="text-sm text-gray-600">
        アップロード可能なファイルサイズ: 最大{maxUploadFileSizeMb}MB
      </p>
      <div className="text-sm">
        保存のみの場合も、編集画面からOCRを実行できます。
      </div>
      <div className="mt-2 flex flex-col items-center gap-1 rounded border border-gray-300 p-2">
        <p>検索メニュー</p>
        <div className="flex items-center gap-1">
          <input
            className="w-fit rounded border border-gray-300 bg-gray-100 p-1 text-left leading-1 text-gray-700 transition-colors duration-200 outline-none focus:border-indigo-500 focus:bg-transparent focus:ring-2 focus:ring-indigo-200"
            type="text"
            value={draftSearchQuery.keyword}
            onChange={(e) => updateSearchQuery("keyword", e.target.value)}
          />
          <Button onClick={applySearch}>検索</Button>
          <Button onClick={clearSearch}>リセット</Button>
        </div>
        <div className="flex gap-1">
          {renderRadioSection("fieldName", "フィールド名")}
          {renderRadioSection("lookupExpr", "検索条件")}
          {renderRadioSection("keywordOperator", "演算子")}
        </div>
        <p className="text-sm">{currentSearchSummary}</p>
      </div>
    </div>
  );
};

export default DocumentToolbar;
