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
  const rawX = event.clientX - rect.left;
  const rawY = event.clientY - rect.top;
  const nx = rawX / rect.width;
  const ny = rawY / rect.height;

  if (rotate === 90) {
    return { x: ny * imageW, y: (1 - nx) * imageH };
  }
  if (rotate === 180) {
    return { x: (1 - nx) * imageW, y: (1 - ny) * imageH };
  }
  if (rotate === 270) {
    return { x: (1 - ny) * imageW, y: nx * imageH };
  }
  return { x: nx * imageW, y: ny * imageH };
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
