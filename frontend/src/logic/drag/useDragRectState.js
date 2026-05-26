/**
 * useDragRectState.js
 *
 * 責務:
 * - point から drag 中の rect を読み取る
 * - WordOverlay 用の pointer event を処理する
 */

import { useState } from "react";

import { rectFromPoints, rectToBbox } from "../transforms/bboxTransforms";

const readPointFromPointerEvent = (event, { imageW, imageH, rotate }) => {
  const rect = event.currentTarget.getBoundingClientRect();
  // ブラウザ画面上でのポインタ位置 clientX/clientYから
  // SVG要素の外接矩形の左上 rect.left/top を引き、SVG表示上のローカル座標にする
  const rawX = event.clientX - rect.left;
  const rawY = event.clientY - rect.top;
  if (rotate === 90) {
    // rect.width/heightは画面上に実際に表示されているSVG要素の外接矩形サイズ
    // raw ÷ rectでローカル座標表示上の何割の位置かを出し、imagePxを掛けて元画像座標に戻す
    const localX = rawY;
    const localY = rect.width - rawX;
    return {
      x: (localX / rect.height) * imageW,
      y: (localY / rect.width) * imageH,
    };
  }
  if (rotate === 180) {
    return {
      x: (1 - rawX / rect.width) * imageW,
      y: (1 - rawY / rect.height) * imageH,
    };
  }
  if (rotate === 270) {
    const localX = rect.height - rawY;
    const localY = rawX;
    return {
      x: (localX / rect.height) * imageW,
      y: (localY / rect.width) * imageH,
    };
  }
  return {
    x: (rawX / rect.width) * imageW,
    y: (rawY / rect.height) * imageH,
  };
};

export const useDragRectState = ({
  imageSizePx = {},
  rotate = 0,
  pageId,
  onAddPendingPostByBbox,
} = {}) => {
  const imageW = imageSizePx.w;
  const imageH = imageSizePx.h;

  const [startPoint, setStartPoint] = useState(null);
  const [currentPoint, setCurrentPoint] = useState(null);

  const clearDragState = () => {
    setStartPoint(null);
    setCurrentPoint(null);
  };

  const draftRect =
    startPoint && currentPoint
      ? rectFromPoints(startPoint, currentPoint)
      : null;

  const onPointerDown = (event) => {
    const point = readPointFromPointerEvent(event, { imageW, imageH, rotate });
    setStartPoint(point);
    setCurrentPoint(point);
  };

  const onPointerMove = (event) => {
    const point = readPointFromPointerEvent(event, { imageW, imageH, rotate });
    if (!startPoint) return;
    setCurrentPoint(point);
  };

  const onPointerCancel = () => {
    clearDragState();
  };

  const onPointerUp = (event) => {
    const endPoint = readPointFromPointerEvent(event, {
      imageW,
      imageH,
      rotate,
    });
    if (!startPoint) {
      clearDragState();
      return;
    }

    const rect = rectFromPoints(startPoint, endPoint);
    clearDragState();

    if (rect.width <= 5 || rect.height <= 5) return;

    const bbox = rectToBbox(rect);
    const aspect = rect.height / rect.width;
    const direction = aspect >= 2 ? 2 : 1;

    onAddPendingPostByBbox(pageId, bbox, direction);
  };

  return {
    draftRect,
    onPointerDown,
    onPointerMove,
    onPointerCancel,
    onPointerUp,
  };
};
