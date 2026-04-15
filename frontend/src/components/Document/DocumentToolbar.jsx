import { useState } from "react";

export default function DocumentToolbar({
  data: { draftSearchQuery = {} } = {},
  events: {
    onChangeSearchInput,
    onClickSearchButton,
    onClickAnalyzeButton,
  } = {},
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  return (
    <div className="mx-auto flex w-fit flex-col rounded-md border border-gray-200 bg-white p-4">
      <details className="flex flex-col items-center">
        <summary className="w-fit cursor-pointer list-none rounded-md bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600">
          検索メニュー
        </summary>

        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={draftSearchQuery.keyword}
            className="w-fit rounded border border-gray-300 bg-gray-100 p-2 text-left leading-2 text-gray-700 transition-colors duration-200 outline-none focus:border-indigo-500 focus:bg-transparent focus:ring-2 focus:ring-indigo-200"
            onChange={(e) => onChangeSearchInput("keyword", e.target.value)}
          />
          <button
            className="w-fit cursor-pointer rounded-md bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600"
            onClick={onClickSearchButton}
          >
            検索
          </button>
        </div>
      </details>

      <div className="mt-2 flex items-center gap-2">
        <input
          id="document-file-input"
          type="file"
          className="hidden"
          onChange={(e) => setSelectedFile(e.target.files[0])}
        />
        <label
          htmlFor="document-file-input"
          className="flex min-h-24 w-64 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-center hover:border-indigo-500 hover:bg-indigo-50"
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
          disabled={!selectedFile}
          onClick={() => onClickAnalyzeButton(selectedFile)}
          className="w-fit rounded-md bg-indigo-500 p-2 text-white enabled:cursor-pointer enabled:hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          OCR実行
        </button>
      </div>
    </div>
  );
}
