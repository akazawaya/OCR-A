import { useCallback, useMemo, useState } from "react";
// Hover時とClick時のwordのidと、TableのDOMに直接挿入できるようなsvgの集合を返す
export const useViewerWordState = (pageData, wordData) => {
  const pages = pageData?.rows ?? [];
  const words = wordData?.rows ?? [];

  const [hoveredWordId, setHoveredWordId] = useState(null);
  const [selectedWordId, setSelectedWordId] = useState(null);
  const [selectedBy, setSelectedBy] = useState(null); // Viewer起点か、Table起点かを示す


  // useCallbackは関数版のuseMemoであり、同じ関数の再構築を防ぐ
    const hoverWord = useCallback((wordId) => {
    const id = Number(wordId);
    if (!Number.isFinite(id)) return;
    setHoveredWordId(id);
    }, []);

    const unHoverWord = useCallback(() => setHoveredWordId(null), []);

    const selectWord = useCallback((wordId, by) => {
    const id = Number(wordId);
    if (!Number.isFinite(id)) return;
    setSelectedWordId(id);
    setSelectedBy(by); // ここが「逆側だけスクロール」の鍵
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

  return {
    pageMetaById, wordsByPageId,
    hoveredWordId, selectedWordId, selectedBy,
    hoverWord, unHoverWord, selectWord,
  };
};
