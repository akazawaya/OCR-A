import { useCallback, useMemo, useState } from "react";
// Hover時とClick時のwordのidと、TableのDOMに直接挿入できるようなsvgの集合を返す
export const useViewerWordState = (pageData, wordData) => {
  const pages = pageData?.rows ?? [];
  const words = wordData?.rows ?? [];

  const [hoveredWordId, setHoveredWordId] = useState(null);
  const [selectedWordId, setSelectedWordId] = useState(null);
  // useCallbackは関数版のuseMemoであり、同じ関数の再構築を防ぐ
  const onWordEnter = useCallback((wordId) => {
    const id = Number(wordId);
    if (!Number.isFinite(id)) return;
    setHoveredWordId(id);
  }, []);

  const onWordLeave = useCallback(() => {
    setHoveredWordId(null);
  }, []);

  const onWordClick = useCallback((wordId) => {
    const id = Number(wordId);
    if (!Number.isFinite(id)) return;
    setSelectedWordId(id);
  }, []);
  
  // pageMetaとしてPageごとのkey,width,heightを格納
  const pageMetaById = useMemo(() => {
    const m = new Map();
    for (const p of pages) {
      const k = Number(p.id); // Page.id
      const w = Number(p.width_px);
      const h = Number(p.height_px);
      if (!Number.isFinite(k) || !Number.isFinite(w) || !Number.isFinite(h)) continue;
      m.set(k, { w, h });
    }
    return m;
  }, [pages]);

  // wordsとしてkeyごとのwordを格納
  const wordsByPageId = useMemo(() => {
    const m = new Map();
    for (const w of words) {
      const k = Number(w.page); // Page.id
      if (!Number.isFinite(k)) continue;
      const arr = m.get(k);
      if (arr) arr.push(w);
      else m.set(k, [w]);
    }
    return m;
  }, [words]);

  const getOverlayForPage = useCallback((pageId) => {
    const k = Number(pageId);
    const meta = pageMetaById.get(k);
    if (!meta) return null;

    const ws = wordsByPageId.get(k) ?? [];
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
              onMouseEnter={() => onWordEnter(w.id)}
              onMouseLeave={onWordLeave}
              onClick={() => onWordClick(w.id)}
            />
          );
        })}
      </svg>
    );
  }, [pageMetaById, wordsByPageId, hoveredWordId, selectedWordId, onWordEnter, onWordLeave, onWordClick]);
  // とりあえずイベントハンドラも返す（不要かも）
  return {
    hoveredWordId,
    selectedWordId,
    onWordEnter,
    onWordLeave,
    onWordClick,
    getOverlayForPage,
  };
};
