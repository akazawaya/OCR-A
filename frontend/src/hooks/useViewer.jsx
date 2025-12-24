import { useState } from "react"; 
// 入力中文字列（draft）を安全に扱い、確定（commit）時だけ useViewer の state を更新する 

const clamp = (n, min, max) => Math.min(max, Math.max(min, n)); // 最小、最大値の定義
const snap = (n, step) => Math.round(n / step) * step;  // 刻み間隔の単位を強制
const wrap360 = (degree) => ((degree % 360) + 360) % 360; // 360→0, -90→270


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
const makeCommit = (setFoo, parser) => (raw) => {
  const normalized = normalizeCommon(raw);
  let next = parser(normalized);
  if (!Number.isFinite(next)) return null;

  next = roundTo(next);

  setFoo(next);
  return String(next);
};


export const useViewer = ({ maxPage } = {}) => {
  const MIN_PAGE = 1;
  const safeMaxPage = Math.max(MIN_PAGE, maxPage);

  const MIN_ZOOM = 25;
  const MAX_ZOOM = 400;
  const ZOOM_STEP = 25;

  const ROTATE_STEP = 90;

  const [page, setPage] = useState(1); 
  const [zoom, setZoom] = useState(100); // 100% 
  const [rotate, setRotate] = useState(0); 

  const commitPage = makeCommit(setPage, (s) => {
    let page = parseInt(s, 10);
    page = clamp(page, MIN_PAGE, safeMaxPage);
    return page;
  });

  const commitZoom = makeCommit(setZoom, (s) => {
    let zoom = parseFloat(String(s).replace("%", ""));
    zoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    zoom = snap(zoom, ZOOM_STEP);
    return zoom;
});

  const commitRotate = makeCommit(setRotate, (s) => {
    let rotate = parseInt(s, 10);
    rotate = snap(rotate, ROTATE_STEP);
    rotate = wrap360(rotate)
    return rotate;
  });
    
  
 
  return {
    page, zoom, rotate, 
    setPage, setZoom, setRotate, // ボタンから直接更新したいときはこっちを使う
    commitPage, commitZoom, commitRotate,
    }; 
};