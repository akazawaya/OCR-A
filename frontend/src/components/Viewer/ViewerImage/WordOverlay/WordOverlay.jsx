import { useLayoutEffect, useMemo, useRef, useState } from "react";

function bboxToRect(bbox) {
  const xs = bbox.map(([x]) => x);
  const ys = bbox.map(([, y]) => y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const right = Math.max(...xs);
  const bottom = Math.max(...ys);
  return { left, top, width: right - left, height: bottom - top };
}

function decideWritingMode(rect) {
  const w = Math.max(1e-6, rect.width);
  const h = Math.max(1e-6, rect.height);
  const aspect = h / w;

  // 決定的ルール：縦に十分細長いなら縦、そうでなければ横
  return aspect >= 2.2 ? "vertical" : "horizontal";
}

// 1つだけ Canvas を使い回す（毎回 create しない）
let _ctx = null;
function measureTextPx(text, fontPx, fontFamily) {
  if (!_ctx) _ctx = document.createElement("canvas").getContext("2d");
  if (!_ctx) return 0;
  _ctx.font = `${fontPx}px ${fontFamily}`;
  return _ctx.measureText(text).width;
}

export default function WordOverlay({ pageId, viewerWordState = {} }) {
  const {
    values: { pageMetaById, wordsByPageId, hoveredWordId, selectedWordId } = {},
    events: { onWordHover, onWordHoverClear, onWordSelect } = {},
  } = viewerWordState;

  const meta = pageMetaById.get(pageId);
  const ws = wordsByPageId.get(pageId) ?? [];

  const layerRef = useRef(null);
  const [layerPx, setLayerPx] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = layerRef.current;
    if (!el) return;

    const update = () => setLayerPx({ w: el.clientWidth, h: el.clientHeight });
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // レイアウト基準のスケール（transform: scale の影響を受けない）
  const scale = useMemo(() => {
    const sx = layerPx.w > 0 ? layerPx.w / meta.w : 1;
    const sy = layerPx.h > 0 ? layerPx.h / meta.h : 1;
    return { sx, sy };
  }, [layerPx.w, layerPx.h, meta.w, meta.h]);

  // span に使う fontFamily を、実際の描画に寄せる（精度のため）
  const fontFamily = useMemo(() => {
    const el = layerRef.current;
    if (!el) return "sans-serif";
    return getComputedStyle(el).fontFamily || "sans-serif";
  }, [layerPx.w, layerPx.h]); // サイズ更新時に一緒に再取得で十分

  const pct = (v, base) => `${(v / base) * 100}%`;

  return (
    <div ref={layerRef} style={{ position: "absolute", inset: 0, zIndex: 10 }}>
      {/* polygonは見た目用。選択はspanでやるので svg 側は pointerEvents none 推奨 */}
      <svg
        viewBox={`0 0 ${meta.w} ${meta.h}`}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 10,
          pointerEvents: "none",
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
              fill={
                isSelected
                  ? "rgba(255,0,0,0.35)"
                  : isHover
                  ? "rgba(255,0,0,0.20)"
                  : "transparent"
              }
              stroke="red"
              strokeWidth="4"
            />
          );
        })}
      </svg>

      {ws.map((w) => {
        const bbox = w.bbox ?? [];
        if (!bbox.length) return null;

        const r = bboxToRect(bbox);

        // 位置は %（SVGと同じ縮尺）
        const left = pct(r.left, meta.w);
        const top = pct(r.top, meta.h);
        const width = pct(r.width, meta.w);
        const height = pct(r.height, meta.h);

        const boxWpx = r.width * scale.sx;
        const boxHpx = r.height * scale.sy;

        const text = `${w.content ?? ""} `;
        const mode = decideWritingMode(r);

        function fitFontPxHorizontal(boxWpx, boxHpx, text, fontFamily) {
          let fontPx = Math.max(1, boxHpx);
          const textW = measureTextPx(text, fontPx, fontFamily) || 1;
          if (textW > boxWpx) fontPx = Math.max(1, fontPx * (boxWpx / textW));
          return fontPx;
        }
        function fitFontPxVertical(boxWpx, boxHpx, text) {
          const s = String(text ?? "").trim();
          const n = Math.max(1, Array.from(s).length);
          return Math.max(1, Math.min(boxWpx, boxHpx / n) * 0.95);
        }
        const fontPx =
          mode === "vertical"
            ? fitFontPxVertical(boxWpx, boxHpx, text)
            : fitFontPxHorizontal(boxWpx, boxHpx, text, fontFamily);

        return (
          <span
            key={w.id}
            data-word={w.id}
            onMouseEnter={() => onWordHover(w.id)}
            onMouseLeave={onWordHoverClear}
            onClick={() => onWordSelect(w.id, "image")}
            style={{
              position: "absolute",
              left, top, width, height,
              fontSize: `${fontPx}px`,
              lineHeight: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              userSelect: "text",
              ...(mode === "vertical"
                ? { writingMode: "vertical-rl", textOrientation: "upright" }
                : null),
              color: "transparent",
            }}
          >
            {text}
          </span>
        );
      })}
    </div>
  );
}
