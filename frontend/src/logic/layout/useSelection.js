import { useCallback, useState } from "react";

// hover / select 状態と選択起点を管理する
export const useSelection = () => {
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedBy, setSelectedBy] = useState(null); // コンポーネント間で相互にやり取りをする際の起点を示す

  const hover = useCallback((id) => {
    setHoveredId(id);
  }, []);

  const clearHovered = useCallback(() => setHoveredId(null), []);

  const commitSelect = useCallback((id, by) => {
    setSelectedId(id);
    setSelectedBy(by);
  }, []);

  return {
    hoveredId,
    selectedId,
    selectedBy,
    hover,
    clearHovered,
    commitSelect,
  };
};
