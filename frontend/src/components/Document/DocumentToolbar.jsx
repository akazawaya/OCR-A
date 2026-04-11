export default function DocumentToolbar({
  data: { conditions = [], inputRef } = {},
  events: {
    onChangeConditions,
    onClickSearchButton,
    onClickAnalyzeButton,
  } = {},
}) {
  return (
    <div className="mx-auto flex w-fit flex-col rounded-md border border-gray-200 bg-white p-4">
      <details className="flex flex-col items-center">
        <summary className="w-fit cursor-pointer list-none rounded-md bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600">
          検索メニュー
        </summary>

        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={conditions[0].value}
            className="w-fit rounded border border-gray-300 bg-gray-100 p-2 text-left leading-2 text-gray-700 transition-colors duration-200 outline-none focus:border-indigo-500 focus:bg-transparent focus:ring-2 focus:ring-indigo-200"
            onChange={onChangeConditions}
          />
          <button
            className="w-fit cursor-pointer rounded-md bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600"
            onClick={onClickSearchButton}
          >
            検索
          </button>
        </div>
      </details>

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          className="file:rounded-md file:border-0 file:bg-indigo-500 file:p-2 file:text-white hover:file:bg-indigo-600"
        />
        <button
          onClick={onClickAnalyzeButton}
          className="w-fit cursor-pointer rounded-md bg-indigo-500 p-2 text-white hover:bg-indigo-600"
        >
          OCR実行
        </button>
      </div>
    </div>
  );
}
