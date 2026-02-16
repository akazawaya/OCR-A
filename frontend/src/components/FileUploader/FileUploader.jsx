export default function FileUploader({
  data: { inputRef } = {},
  options: { onClickAnalyzeButton },
}) {
  return (
    <div>
      <input ref={inputRef} type="file" />
      <button onClick={onClickAnalyzeButton}>OCR実行</button>
    </div>
  );
}
