import { useCallback, useState } from "react";

export const getIdsBetween = (ids, anchorId, targetId) => {
  const anchorIndex = ids.indexOf(anchorId);
  const targetIndex = ids.indexOf(targetId);

  if (anchorIndex === -1 || targetIndex === -1) {
    return [targetId];
  }

  const startIndex = Math.min(anchorIndex, targetIndex);
  const endIndex = Math.max(anchorIndex, targetIndex);

  return ids.slice(startIndex, endIndex + 1);
};

// hover / select 状態と選択起点を管理する
export const useSelection = () => {
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [selectedBy, setSelectedBy] = useState(null); // コンポーネント間で相互にやり取りをする際の起点を示す
  const [anchorId, setAnchorId] = useState(null); // shiftクリックの範囲起点用
  const [scrollTargetId, setScrollTargetId] = useState(null); //　単一クリック的な動作はscroll対象とする
  const hover = useCallback((id) => {
    setHoveredId(id);
  }, []);

  const clearHovered = useCallback(() => setHoveredId(null), []);

  // 通常クリック：択一選択
  const replaceSelection = useCallback((id, by) => {
    setSelectedIds(new Set([id]));
    setAnchorId(id);
    setScrollTargetId(id);
    setSelectedBy(by);
  }, []);

  // Ctrl/Cmdクリック：単体の選択状態を反転
  const toggleSelection = useCallback((id, by) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setAnchorId(id);
    setScrollTargetId(id);
    setSelectedBy(by);
  }, []);

  // Shiftクリック：複数追加
  const replaceSelectionRange = useCallback((ids, by) => {
    setSelectedIds(new Set(ids));
    setSelectedBy(by);
  }, []);

  // Ctrl/Cmd+Shiftクリック：複数追加で反転がない
  const addSelectionRange = useCallback((ids, by) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    setSelectedBy(by);
  }, []);

  // 削除パターン
  const removeSelection = useCallback((ids) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

  return {
    hoveredId,
    selectedIds,
    selectedBy,
    anchorId,
    scrollTargetId,
    hover,
    clearHovered,
    replaceSelection,
    toggleSelection,
    replaceSelectionRange,
    addSelectionRange,
    removeSelection,
  };
};
