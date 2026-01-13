import { useState } from "react"; 

// raw→str（空白除去、全角数字を半角化）　ASCII digitsは0〜9の半角数字（ASCII の数字）の意味
const toAsciiDigits = (raw) => {
  const map = {
    "０":"0","１":"1","２":"2","３":"3","４":"4","５":"5","６":"6","７":"7","８":"8","９":"9",
  }
  return String(raw)
    .trim() //その文字列の 前後の空白を削る（中間の空白は消えない）
    .replace(/[０-９]/g, (ch) => map[ch] ?? ""); // g：global 文字列中の全部を対象にする
};

// raw(入力)→str→numに直す　もしくはnullを返す
const parseRawToNumOrNull = (raw) => {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const str = toAsciiDigits(raw);
  if (str === "") return null;

  const num = parseInt(str, 10);
  return Number.isFinite(num) ? num : null;
};

// num→numの変換関数一覧
const clamp = (num, min, max) => Math.min(max, Math.max(min, num)); // 最小、最大値の定義
const snap = (num, step) => Math.round(num / step) * step;  // 刻み間隔の単位を強制
const wrap360 = (degree) => ((degree % 360) + 360) % 360; // 360→0, -90→270


// makeFooは関数を返す関数　クロージャ（closure）が発生　「関数＋その関数が覚えている外側の変数セット」
// makeRawToNumberの場合は、fixNum(numを変換する関数)を受取り,その引数としてrawも受け取る
// 返り値は、1回目の呼び出し makeRawToNumber(fixNum)で(raw) => {...}までの無名関数＝rawToNum を返す （(raw) => {...}までの式が暗黙にreturnされる）
// 2回目の呼び出し rawToNum(raw) の返り値は「fixNum(num) の結果」＝ NumOrNull 
const makeRawToNumber = (fixNum) => (raw) => {
  const num = parseRawToNumOrNull(raw);
  if (num == null) return null;
  return fixNum(num);
};

const makeSet = (_setFoo, rawToNum) => (updater) => {
  _setFoo((num) => {
    const raw = typeof updater === "function" ? updater(num) : updater;
    const num2 = rawToNum(raw);
    return num2 ?? num;
  });
};

const makeCommit = (_setFoo, rawToNum) => (raw) => {
  const num = rawToNum(raw);
  if (num == null) return null;
  _setFoo(num);
  return String(num);
};


export const useViewerPageState = ({ maxPage }) => {
  const MIN_PAGE = 1;
  const safeMaxPage = Math.max(MIN_PAGE, maxPage);
  const MIN_ZOOM = 25, MAX_ZOOM = 300, ZOOM_STEP = 25;
  const ROTATE_STEP = 90;

  const [page, _setPage] = useState(1); 
  const [zoom, _setZoom] = useState(100); // 100% 
  const [rotate, _setRotate] = useState(0); 

  const rawToPage = makeRawToNumber((num) => clamp(num, 1, safeMaxPage));
  const rawToZoom = makeRawToNumber((num) => clamp(snap(num, ZOOM_STEP), MIN_ZOOM, MAX_ZOOM));
  const rawToRotate = makeRawToNumber((num) => wrap360(snap(num, ROTATE_STEP)));

  const setPage = makeSet(_setPage, rawToPage);
  const commitPage = makeCommit(_setPage, rawToPage);

  const setZoom = makeSet(_setZoom, rawToZoom);
  const commitZoom = makeCommit(_setZoom, rawToZoom);

  const setRotate = makeSet(_setRotate, rawToRotate);
  const commitRotate = makeCommit(_setRotate, rawToRotate);
  

  return {
    page, zoom, rotate, 
    setPage, setZoom, setRotate, // ボタンから直接更新したいときはこっちを使う
    commitPage, commitZoom, commitRotate,
    ZOOM_STEP, ROTATE_STEP
  }; 
};

