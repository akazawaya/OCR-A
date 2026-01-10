function bboxToRect(bbox) {
  const xs = bbox.map(([x]) => x);
  const ys = bbox.map(([, y]) => y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const right = Math.max(...xs);
  const bottom = Math.max(...ys);
  return { left, top, width: right - left, height: bottom - top };
}


export default function WordOverlay({
  pageId,
  viewerWordState = {},
} ) {

  // ↑reactのコンポーネント関数は常に第一引数にprops　なので{}ですべて囲む
  const {
    values: { pageMetaById, wordsByPageId, hoveredWordId, selectedWordId } = {},
    events: { onWordHover, onWordHoverClear, onWordSelect } = {},
  } = viewerWordState;
  const meta = pageMetaById.get(pageId);
  if (!meta) return null;

  const ws = wordsByPageId.get(pageId) ?? [];
  if (!ws.length) return null;

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
      <svg
        viewBox={`0 0 ${meta.w} ${meta.h}`}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 10,
          pointerEvents: "none", // 子polygonで拾う
        }}
      >
        {ws.map((w) => {
          const isSelected = w.id === selectedWordId;
          const isHover = w.id === hoveredWordId;
          const points = (w.bbox ?? []).map(([x, y]) => `${x},${y}`).join(" ");
          if (!points) return null;
          return (
            <polygon
              key={w.id}
              data-word={w.id} 
              points={points}
              fill={isSelected ? "rgba(255,0,0,0.35)" : isHover ? "rgba(255,0,0,0.20)" : "transparent"}
              stroke="red"
              strokeWidth="4"
              pointerEvents="none"
            />
          );
        })};
    </svg>
    {ws.map((w) => {
      const { left, top, width, height } = bboxToRect(w.bbox);
      const pct = (v, base) => `${(v / base) * 100}%`;
      const rect = bboxToRect(w.bbox);
      const clip = `polygon(${w.bbox.map(([x,y]) => {
        const px = ((x - rect.left) / rect.width) * 100;
        const py = ((y - rect.top) / rect.height) * 100;
        return `${px}% ${py}%`;
      }).join(",")})`;

      return (
        <span
          key={w.id}
          data-word={w.id}
          onMouseEnter={() => onWordHover(w.id)}
          onMouseLeave={onWordHoverClear}
          onClick={() => onWordSelect(w.id, "image")}
          style={{
            position: "absolute",
            left: pct(left, meta.w),
            top: pct(top, meta.h),
            width: pct(width, meta.w),
            height: pct(height, meta.h),
            clipPath: clip, // spanのpolygon 形状による領域切り抜き
            display: "block",
            userSelect: "text",
          }}//これで絶対座標にしないと画像と共存できない
        >
        {w.content + " "}
        </span>
      )
    })}
  </div>
)}