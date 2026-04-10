import { useCallback, useState } from "react";

// Hover時とClick時のwordのidと、TableのDOMに直接挿入できるようなsvgの集合を返す
export const useViewerWordState = () => {
  const [hoveredWordId, setHoveredWordId] = useState(null);
  const [selectedWordId, setSelectedWordId] = useState(null);
  const [selectedBy, setSelectedBy] = useState(null); // Viewer起点か、Table起点かを示す

  const hoverWord = useCallback((wordId) => {
    const id = Number(wordId);
    if (!Number.isFinite(id)) return;
    setHoveredWordId(id);
  }, []);

  const clearHoveredWord = useCallback(() => setHoveredWordId(null), []);

  const commitSelectWord = useCallback((wordId, by) => {
    const id = Number(wordId);
    if (!Number.isFinite(id)) return;
    setSelectedWordId(id);
    setSelectedBy(by);
  }, []);

  return {
    hoveredWordId,
    selectedWordId,
    selectedBy,
    hoverWord,
    clearHoveredWord,
    commitSelectWord,
  };
};
