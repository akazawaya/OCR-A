import { useViewerWordStateContext } from "../../../../contexts/viewer/ViewerWordStateContext";
import { useElementSize } from "../../../../hooks/layout/useElementSize";
import { buildWordOverlayLayout } from "../../../../hooks/layout/buildWordOverlayLayout";
import { useMemo } from "react";

export default function WordOverlay({ pageId }) {
  const viewerWordState = useViewerWordStateContext();
  const { ref: layerRef, layerPx } = useElementSize();

  const {
    values: { pageMetaById, wordsByPageId, hoveredWordId, selectedWordId } = {},
    events: { onHoverWord, onHoverClearWord, onSelectWord } = {},
  } = viewerWordState;

  const meta = pageMetaById.get(pageId);
  const words = wordsByPageId.get(pageId);

  const { wordLayout } = useMemo(
    () => buildWordOverlayLayout({ layerPx, meta, words }),
    [layerPx, meta, words],
  );

  return (
    <div ref={layerRef} style={{ position: "absolute", inset: 0, zIndex: 10 }}>
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
        {wordLayout.map((w) => {
          const isSelected = w.id === selectedWordId;
          const isHover = w.id === hoveredWordId;
          return (
            <polygon
              key={w.id}
              data-word={w.id}
              points={w.points}
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
            style={{
              position: "absolute",
              ...w.rectStyle,
              fontSize: `${w.fontPx}px`,
              lineHeight: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              userSelect: "text",
              ...(w.mode === "vertical"
                ? { writingMode: "vertical-rl", textOrientation: "upright" }
                : null),
              color: "transparent",
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
}
