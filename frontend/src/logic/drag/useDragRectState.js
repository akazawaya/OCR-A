/**
 * useDragRectState.js
 *
 * 責務:
 * - point から drag 中の rect を読み取る
 * - WordOverlay 用の pointer event を処理する
 */

import { useState } from "react";

import { rectFromPoints, rectToBbox } from "../transforms/bboxTransforms";

const readPointFromPointerEvent = (event, { imageW, imageH }) => {
  const rect = event.currentTarget.getBoundingClientRect();
  const rawX = event.clientX - rect.left;
  const rawY = event.clientY - rect.top;

  const scaleX = rect.width === 0 ? 0 : imageW / rect.width;
  const scaleY = rect.height === 0 ? 0 : imageH / rect.height;

  return {
    x: rawX * scaleX,
    y: rawY * scaleY,
  };
};

export const useDragRectState = ({
  imageW,
  imageH,
  pageId,
  onAddPendingPostByBbox,
} = {}) => {
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
    const point = readPointFromPointerEvent(event, { imageW, imageH });
    if (!point) return;
    setStartPoint(point);
    setCurrentPoint(point);
  };

  const onPointerMove = (event) => {
    const point = readPointFromPointerEvent(event, { imageW, imageH });
    if (!point || !startPoint) return;
    setCurrentPoint(point);
  };

  const onPointerCancel = () => {
    clearDragState();
  };

  const onPointerUp = (event) => {
    if (!pageId) {
      clearDragState();
      return;
    }
    if (!onAddPendingPostByBbox) {
      clearDragState();
      return;
    }
    const endPoint = readPointFromPointerEvent(event, { imageW, imageH });
    if (!startPoint || !endPoint) {
      clearDragState();
      return;
    }

    const rect = rectFromPoints(startPoint, endPoint);
    clearDragState();

    if (rect.width <= 5 || rect.height <= 5) return;

    const bbox = rectToBbox(rect);
    const safeWidth = rect.width === 0 ? 1 : rect.width;
    const aspect = rect.height / safeWidth;
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
