/**
 * bboxTransforms
 *
 * 役割:
 * - bbox を基本として、派生する座標情報を作る
 * - ここで扱うのは、図形情報とその描画用表現への純粋変換のみ
 */

export const bboxToPolygonPoints = (bbox) => {
  return bbox.map(([x, y]) => `${x},${y}`).join(" ");
};

export const bboxToBounds = (bbox) => {
  const xs = bbox.map(([x]) => {
    const num = Number(x);
    return Number.isFinite(num) ? num : 0;
  });
  const ys = bbox.map(([, y]) => {
    const num = Number(y);
    return Number.isFinite(num) ? num : 0;
  });

  return {
    xMin: Math.min(...xs),
    yMin: Math.min(...ys),
    xMax: Math.max(...xs),
    yMax: Math.max(...ys),
  };
};

export const bboxToRect = (bbox) => {
  const bounds = bboxToBounds(bbox);

  return {
    left: bounds.xMin,
    top: bounds.yMin,
    width: bounds.xMax - bounds.xMin,
    height: bounds.yMax - bounds.yMin,
  };
};

export const rectFromPoints = (startPoint, endPoint) => ({
  x: Math.min(startPoint.x, endPoint.x),
  y: Math.min(startPoint.y, endPoint.y),
  width: Math.abs(endPoint.x - startPoint.x),
  height: Math.abs(endPoint.y - startPoint.y),
});

export const rectToBbox = (rect) => {
  return [
    [rect.x, rect.y],
    [rect.x + rect.width, rect.y],
    [rect.x + rect.width, rect.y + rect.height],
    [rect.x, rect.y + rect.height],
  ];
};

export const rectToSpanStyle = (rect, imageSizePx) => {
  const toPercent = (value, base) => `${(value / base) * 100}%`;

  return {
    left: toPercent(rect.left, imageSizePx.w),
    top: toPercent(rect.top, imageSizePx.h),
    width: toPercent(rect.width, imageSizePx.w),
    height: toPercent(rect.height, imageSizePx.h),
  };
};
