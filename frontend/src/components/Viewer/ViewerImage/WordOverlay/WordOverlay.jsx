// css部分はjsxから切り離す、
// useHover的なものの作成検討を行い、onClick,onHover等の都合をviewerImageと合わせる
import { useMemo, useRef } from "react";

import { useViewerWordStateContext } from "../../../../contexts/viewer/ViewerWordStateContext";
import { useClientSizePx } from "../../../../hooks/layout/useClientSizePx";
import { buildWordOverlayLayout } from "../../../../hooks/layout/buildWordOverlayLayout";

export default function WordOverlay({ pageId }) {
  const viewerWordState = useViewerWordStateContext();
  const elementRef = useRef(null);
  const { clientSizePx } = useClientSizePx(elementRef);

  const {
    values: { pageMetaById, wordsByPageId, hoveredWordId, selectedWordId } = {},
    events: { onHoverWord, onHoverClearWord, onSelectWord } = {},
  } = viewerWordState;

  const meta = pageMetaById.get(pageId);
  const words = wordsByPageId.get(pageId);
  const imageSizePx = meta ? { w: meta.w, h: meta.h } : null;

  const { wordLayout } = useMemo(
    () => buildWordOverlayLayout({ clientSizePx, imageSizePx, words }),
    [clientSizePx, imageSizePx, words],
  );

  return (
    <div
      ref={elementRef}
      style={{ position: "absolute", inset: 0, zIndex: 10 }}
    >
      <svg
        viewBox={`0 0 ${imageSizePx?.w ?? 0} ${imageSizePx?.h ?? 0}`}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        {wordLayout.map((w) => {
          const isSelected = w.id === selectedWordId;
          const isHover = w.id === hoveredWordId;
          return (
            <polygon
              key={w.id}
              data-word={w.id}
              points={w.polygon.points}
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

      {wordLayout.map((w) => {
        return (
          <span
            key={w.id}
            data-word={w.id}
            onMouseEnter={() => onHoverWord(w.id)}
            onMouseLeave={onHoverClearWord}
            onClick={() => onSelectWord(w.id, "image")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectWord(w.id, "image");
              } // 現状意味がないので強化検討の対象
            }}
            style={{
              position: "absolute",
              ...w.span.style,
              fontSize: `${w.span.fontPx}px`,
              lineHeight: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              userSelect: "text",
              ...(w.span.mode === "vertical"
                ? { writingMode: "vertical-rl", textOrientation: "upright" }
                : null),
              color: "transparent",
            }}
          >
            {w.span.text}
          </span>
        );
      })}
    </div>
  );
}
