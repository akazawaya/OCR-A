import { useRef } from "react";

async function analyzeDocument(analyzeUrl, file) {
  const fd = new FormData();
  fd.append("file", file); 

  const res = await fetch(analyzeUrl, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: fd,
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(()=> "")}`);
  return res.json();
}

export default function FileUploader({ config: { analyzeUrl } }) {
  const inputRef = useRef(null);

  const handleClick = async () => {
    const f = inputRef.current?.files?.[0];
    if (!f) { alert("ファイルを選択してください"); return;}
    try {
      const data = await analyzeDocument(analyzeUrl, f);
      console.log("analyze result:", data); 
    } catch (e) {
      console.error(e);
      alert(String(e)); 
    }
  };

  return (
    <div>
      <input ref={inputRef} type="file" />
      <button onClick={handleClick}>OCR実行</button>
    </div>
  );
}