export default function FileUploader({
  data: { inputRef } = {},
  events: { onClickAnalyzeButton } = {},
}) {
  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        className="file:rounded-md file:border-0 file:bg-indigo-500 file:p-2 file:text-white hover:file:bg-indigo-600"
      />
      <button
        onClick={onClickAnalyzeButton}
        className="w-fit cursor-pointer list-none rounded-md bg-indigo-500 p-2 text-white hover:bg-indigo-600"
      >
        OCR実行
      </button>
    </div>
  );
}
