export default function FileUploader({
  data: { inputRef } = {},
  events: { onClickAnalyzeButton } = {},
}) {
  return (
    <div>
      <input ref={inputRef} type="file" />
      <button onClick={onClickAnalyzeButton}>OCR実行</button>
    </div>
  );
}
