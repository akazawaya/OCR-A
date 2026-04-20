/**
 * dragBindings.js
 *
 * 責務:
 * - PointerEvent から点を読み取り、useDragRect に渡す
 * - down / move / cancel のイベントハンドラを組み立てる
 * - EndDragでは bbox 化と word 追加を行う
 */
import { rectToBbox } from "../transforms/bboxTransforms";

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

export const buildStartDragFromPointerEvent = ({
  imageW,
  imageH,
  startDrag,
}) => {
  return (event) => {
    const point = readPointFromPointerEvent(event, { imageW, imageH });
    startDrag(point);
  };
};

export const buildMoveDragFromPointerEvent = ({ imageW, imageH, moveDrag }) => {
  return (event) => {
    const point = readPointFromPointerEvent(event, { imageW, imageH });
    moveDrag(point);
  };
};

export const buildCancelDragFromPointerEvent = ({ cancelDrag }) => {
  return () => {
    cancelDrag();
  };
};

export const buildEndlDragFromPointerEvent = ({
  endDrag,
  pageId,
  imageW,
  imageH,
  addPendingPostByBbox,
}) => {
  return (event) => {
    if (!pageId) return;

    const point = readPointFromPointerEvent(event, { imageW, imageH });
    const rect = endDrag(point);

    if (!rect) return;
    if (rect.width <= 5 || rect.height <= 5) return;

    const bbox = rectToBbox(rect);

    const safeWidth = rect.width === 0 ? 1 : rect.width;
    const aspect = rect.height / safeWidth;
    const direction = aspect >= 2 ? 2 : 1;

    addPendingPostByBbox(pageId, bbox, direction);
  };
};
