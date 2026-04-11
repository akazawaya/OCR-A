/**
 * useDragRectState.js
 *
 * 責務:
 * - point から drag 中の rect を作る
 */

import { useState } from "react";

const buildRectFromPoints = (startPoint, endPoint) => ({
  x: Math.min(startPoint.x, endPoint.x),
  y: Math.min(startPoint.y, endPoint.y),
  width: Math.abs(endPoint.x - startPoint.x),
  height: Math.abs(endPoint.y - startPoint.y),
});

export const useDragRectState = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [currentPoint, setCurrentPoint] = useState(null);

  const draftRect =
    startPoint && currentPoint
      ? buildRectFromPoints(startPoint, currentPoint)
      : null;

  const startDrag = (point) => {
    if (!point) return;
    setIsDragging(true);
    setStartPoint(point);
    setCurrentPoint(point);
  };

  const moveDrag = (point) => {
    if (!point || !startPoint) return;
    setCurrentPoint(point);
  };

  const endDrag = (point) => {
    const endPoint = point ?? currentPoint;

    if (!startPoint || !endPoint) {
      setIsDragging(false);
      setStartPoint(null);
      setCurrentPoint(null);
      return null;
    }

    const rect = buildRectFromPoints(startPoint, endPoint);

    setIsDragging(false);
    setStartPoint(null);
    setCurrentPoint(null);

    return rect;
  };

  const cancelDrag = () => {
    setIsDragging(false);
    setStartPoint(null);
    setCurrentPoint(null);
  };

  return {
    data: {
      isDragging,
      draftRect,
    },
    events: {
      startDrag,
      moveDrag,
      endDrag,
      cancelDrag,
    },
  };
};
