import { useCallback, useMemo } from "react";
// TableのDOMに直接挿入できるようなsvgのBoxの集合を返す
export const useViewerWordState = (pageData, wordData) => {
  const pages = pageData?.rows ?? [];
  const words = wordData?.rows ?? [];

  // pageMetaとしてPageごとのkey,width,heightを格納
  const pageMetaById = useMemo(() => {
  const m = new Map();
  for (const p of pages) {
      const k = Number(p.id);              // ← page_number ではなく id
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
      const k = Number(w.page);            // ← これは Page.id を指す
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
          pointerEvents: "none",
          zIndex: 10, // 画像より上に出す（安全策）
      }}
      >
      {ws.map((w) => {
          const points = w.bbox.map(([x, y]) => `${x},${y}`).join(" ");
          return <polygon key={w.id} points={points} fill="none" stroke="red" strokeWidth="4" />;
      })}
      </svg>
  );
  }, [pageMetaById, wordsByPageId]);


  return { getOverlayForPage };
};
