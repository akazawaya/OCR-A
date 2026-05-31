import { useState } from "react";

import { VIEWER_ZOOM, VIEWER_ROTATE_STEP } from "./viewerPageConstants";

// raw→str（空白除去、全角数字を半角化）　ASCII digitsは0〜9の半角数字（ASCII の数字）の意味
const rawToAsciiDigits = (raw) => {
  const map = {
    "０": "0",
    "１": "1",
    "２": "2",
    "３": "3",
    "４": "4",
    "５": "5",
    "６": "6",
    "７": "7",
    "８": "8",
    "９": "9",
  };
  return String(raw)
    .trim() //その文字列の 前後の空白を削る（中間の空白は消えない）
    .replace(/[０-９]/g, (ch) => map[ch]); // g：global 文字列中の全部を対象にする
};

// raw(入力)→str→numに直す　もしくはnullを返す
// nullはrawの不正値を意味し、buildSet、buildCommitにて値を反映せず間引く形となる
const parseRawToNumOrNull = (raw) => {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const str = rawToAsciiDigits(raw);
  if (str === "") return null;

  const num = parseInt(str, 10);
  return Number.isFinite(num) ? num : null;
};

// num→numの変換関数一覧
const clamp = (num, min, max) => Math.min(max, Math.max(min, num)); // 最小、最大値の定義
const snap = (num, step) => Math.round(num / step) * step; // 刻み間隔の単位を強制
const wrap360 = (degree) => ((degree % 360) + 360) % 360; // 360→0, -90→270　のように正規化

// これはrawToNumOrNullを行う関数を作成する高階関数のため
// buildRawToNumOrNullと命名（buildSet,buildCommitも同様)
const buildRawToNumOrNull = (fixNum) => (raw) => {
  const num = parseRawToNumOrNull(raw);
  if (num == null) return null;
  return fixNum(num);
};

const buildSet = (_setFoo, rawToNum) => (updater) => {
  _setFoo((num) => {
    const raw = typeof updater === "function" ? updater(num) : updater;
    const num2 = rawToNum(raw);
    return num2 ?? num;
  });
};

// 返り値はコンポーネント側でのinput表示の書き戻し用
const buildCommit = (_setFoo, rawToNum) => (raw) => {
  const num = rawToNum(raw);
  if (num == null) return null;
  _setFoo(num);
  return String(num);
};

export const useViewerPageState = ({ maxPage }) => {
  const safeMaxPage = Math.max(1, maxPage);
  const [page, _setPage] = useState(1);
  const [zoom, _setZoom] = useState(100); // 100=100%
  const [rotate, _setRotate] = useState(0);

  const rawToPage = buildRawToNumOrNull((num) => clamp(num, 1, safeMaxPage));
  const rawToZoom = buildRawToNumOrNull((num) =>
    clamp(snap(num, VIEWER_ZOOM.STEP), VIEWER_ZOOM.MIN, VIEWER_ZOOM.MAX),
  );
  const rawToRotate = buildRawToNumOrNull((num) =>
    wrap360(snap(num, VIEWER_ROTATE_STEP)),
  );

  // setFoo: ボタン操作などの更新要求を反映する
  const setPage = buildSet(_setPage, rawToPage);
  const setZoom = buildSet(_setZoom, rawToZoom);
  const setRotate = buildSet(_setRotate, rawToRotate);

  // commitFoo: input文字列を確定値にして反映する
  const commitPage = buildCommit(_setPage, rawToPage);
  const commitZoom = buildCommit(_setZoom, rawToZoom);
  const commitRotate = buildCommit(_setRotate, rawToRotate);
  const canGoPrevPage = page > 1;
  const canGoNextPage = page < safeMaxPage;
  const canZoomOut = zoom - VIEWER_ZOOM.STEP >= VIEWER_ZOOM.MIN;
  const canZoomIn = zoom + VIEWER_ZOOM.STEP <= VIEWER_ZOOM.MAX;

  return {
    page,
    zoom,
    rotate,
    canGoPrevPage,
    canGoNextPage,
    canZoomOut,
    canZoomIn,
    setPage,
    setZoom,
    setRotate,
    commitPage,
    commitZoom,
    commitRotate,
  };
};
