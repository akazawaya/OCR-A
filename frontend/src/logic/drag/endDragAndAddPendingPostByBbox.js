import { rectToBbox } from "../transforms/bboxTransforms";

/**
 * endDragAndAddPendingPostByBbox.js
 *
 * 責務:
 * - drag の終了時に bbox を作成し、addPendingPostByBbox に追加する
 */
const readPointFromPointerEvent = (event, { imageW, imageH }) => {
  const rect = event.currentTarget.getBoundingClientRect();

  const rawX = event.clientX - rect.left;
  const rawY = event.clientY - rect.top;

  const clampedX = Math.max(0, Math.min(rawX, rect.width));
  const clampedY = Math.max(0, Math.min(rawY, rect.height));

  const scaleX = rect.width === 0 ? 0 : imageW / rect.width;
  const scaleY = rect.height === 0 ? 0 : imageH / rect.height;

  return {
    x: clampedX * scaleX,
    y: clampedY * scaleY,
  };
};

const inferDirectionFromRect = (rect) => {
  const safeWidth = rect.width === 0 ? 1 : rect.width;
  const aspect = rect.height / safeWidth;
  return aspect >= 2 ? 2 : 1;
};

const isCreatableRect = (rect) => {
  if (!rect) return false;
  return rect.width > 5 && rect.height > 5;
};

export const buildEndDragAndAddPendingPostByBbox = ({
  pageId,
  imageW,
  imageH,
  endDrag,
  addPendingPostByBbox,
}) => {
  return (event) => {
    if (!pageId) return;

    const point = readPointFromPointerEvent(event, { imageW, imageH });
    const rect = endDrag(point);

    if (!isCreatableRect(rect)) return;

    const bbox = rectToBbox(rect);
    const direction = inferDirectionFromRect(rect);

    addPendingPostByBbox(pageId, bbox, direction);
  };
};
