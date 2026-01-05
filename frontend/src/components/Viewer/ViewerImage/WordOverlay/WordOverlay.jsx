export default function WordOverlay({ viewerWordState, pageId } ) {

  // ↑reactのコンポーネント関数は常に第一引数にprops　なので{}ですべて囲む
  const { pageMetaById, wordsByPageId,
    hoveredWordId, selectedWordId, selectedBy,
    hoverWord, clearHoveredWord, commitSelectWord }= viewerWordState;

  const meta = pageMetaById.get(pageId);
  if (!meta) return null;

  const ws = wordsByPageId.get(pageId) ?? [];
  if (!ws.length) return null;

  return (
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
            points={points}
            fill={isSelected ? "rgba(255,0,0,0.35)" : isHover ? "rgba(255,0,0,0.20)" : "transparent"}
            stroke="red"
            strokeWidth="4"
            pointerEvents="all"
            onMouseEnter={() => hoverWord(w.id)}
            onMouseLeave={clearHoveredWord}
            onClick={() => commitSelectWord(w.id, "image")}
          />
        );
      })};
    </svg>
  );
};