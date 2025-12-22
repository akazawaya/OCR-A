import { useState } from "react"; 
// 入力中文字列（draft）を安全に扱い、確定（commit）時だけ useViewer の state を更新する 


// 全角→半角（数字・記号の最小セット）
const normalizeCommon = (s) => {
  const map = {
    "０":"0","１":"1","２":"2","３":"3","４":"4","５":"5","６":"6","７":"7","８":"8","９":"9",
  };
  return String(s)
    .trim() //その文字列の 前後の空白を削る（中間の空白は消えない）
    .replace(/[０-９]/g, (ch) => map[ch] ?? ""); // g：global 文字列中の全部を対象にする
};

// 四捨五入（digits=0 なら整数、digits=2 なら小数2桁）
const roundTo = (n, digits = 0) => {
  const p = 10 ** digits;
  return Math.round(n * p) / p;
};

// 成功→表示用文字列を返す / 失敗→null
const makeCommit = (setFoo, parser, roundDigits) => (raw) => {
  const normalized = normalizeCommon(raw);
  let next = parser(normalized);
  if (!Number.isFinite(next)) return null;

  if (roundDigits !== undefined) next = roundTo(next, roundDigits);

  setFoo(next);
  return String(next);
};


export const useViewer = () => {
  const [page, setPage] = useState(1); 
  const [zoom, setZoom] = useState(100); // 100% 
  const [rotate, setRotate] = useState(0); 

  const commitPage = makeCommit(setPage, (s) => parseInt(s, 10), 0);
  const commitZoom = makeCommit(setZoom, (s) => parseFloat(String(s).replace("%", "")), 0);
  const commitRotate = makeCommit(setRotate, (s) => parseInt(s, 10), 0);

  return {
    page, zoom, rotate, 
    setPage, setZoom, setRotate, // ボタンから直接更新したいときはこっちを使う
    commitPage, commitZoom, commitRotate,
    }; 
};