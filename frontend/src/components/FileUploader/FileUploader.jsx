import { useRef } from "react";
import { requestApi } from "../../api/requestApi";
import { useRefresh } from "../../contexts/refreshContext";

async function analyzeDocument(analyzeUrl, file) {
  const fd = new FormData();
  fd.append("file", file); 
  // async 関数は 明示的に returnしなければpromise(中身はvoid)になる
  const { res, data } = await requestApi(analyzeUrl, {
    method: "POST",
    body: fd
  });
  return { res, data };
}

export default function FileUploader({ fetchBase: { analyzeUrl }}) {
  const inputRef = useRef(null);
  const onRefresh = useRefresh();

  const handleClick = async () => {
    const f = inputRef.current?.files?.[0];
    if (!f) { alert("ファイルを選択してください"); return;}
      const { res, data } = await analyzeDocument(analyzeUrl, f);
    if (res?.ok) 
      onRefresh();
  };

  return (
    <div>
      <input ref={inputRef} type="file" />
      <button onClick={handleClick}>OCR実行</button>
    </div>
  );
}