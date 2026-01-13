import { useViewerWordOverlayLayout } from "../../../../hooks/layout/useViewerWordOverlayLayout";

export default function WordOverlay({ pageId, viewerWordState = {} }) {
  const {
    values: { pageMetaById, wordsByPageId, hoveredWordId, selectedWordId } = {},
    events: { onWordHover, onWordHoverClear, onWordSelect } = {},
  } = viewerWordState;

  const meta = pageMetaById.get(pageId);
  const ws = wordsByPageId.get(pageId) ?? [];

  const { layerRef, wordLayout } = useViewerWordOverlayLayout(meta, ws);

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
            onMouseEnter={() => onWordHover(w.id)}
            onMouseLeave={onWordHoverClear}
            onClick={() => onWordSelect(w.id, "image")}
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
