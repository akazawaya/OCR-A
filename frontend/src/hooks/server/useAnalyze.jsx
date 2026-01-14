import { useRef } from "react";
import { requestApi } from "../../api/requestApi";

export const useAnalyze = (analyzeUrl, onRefresh) => {
  const inputRef = useRef(null);

  const analyzeData = async () => {
    const f = inputRef.current?.files?.[0];
    if (!f) {
      alert("ファイルを選択してください");
      return; 
    }

    const fd = new FormData();
    fd.append("file", f); 
    
    const { res } = await requestApi(analyzeUrl, {
      method: "POST",
      body: fd
    });

    if (res?.ok) {
      onRefresh(); 
      }
    };

  return { inputRef, analyzeData };
};
