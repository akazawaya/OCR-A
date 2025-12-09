export default function FileUploader({
  data:{inputRef} = {},
  options:{onAnalyzeButtonClick}
  }){

  return (
    <div>
      <input ref={inputRef} type="file" />
      <button onClick={ onAnalyzeButtonClick }>OCR実行</button>
    </div>
  );
}