/**
 * wordOverlayDragBindings.js
 *
 * 責務:
 * - PointerEvent から点を読み取り、useDragRect に渡す
 * - down / move / cancel のイベントハンドラを組み立てる
 * - bbox 化や word 追加は、endDragのイベントハンドラのendDragAndAddPendingPostByBbox に任せる
 */

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
