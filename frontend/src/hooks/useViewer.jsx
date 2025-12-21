import { useState } from "react"; 
// 入力中文字列（draft）を安全に扱い、確定（commit）時だけ useViewer の state を更新する 

  export const useViewer = () => {
    const [page, setPage] = useState(1); 
    const [zoom, setZoom] = useState(100); // 100% 
    const [rotate, setRotate] = useState(0); 
    return { page, zoom, rotate, setPage, setZoom, setRotate }; 
  };