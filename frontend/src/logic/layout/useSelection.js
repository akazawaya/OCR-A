import { useCallback, useState } from "react";

// 起点idと終点idからshift範囲選択時のID一覧を作る関数
export const buildRangeSelectionIds = ({ orderedIds, startId, endId }) => {
  const startIndex = orderedIds.indexOf(startId);
  const endIndex = orderedIds.indexOf(endId);
  // 履歴となるstartがない場合は単にendId(クリック操作があった際のidそのものの想定)を返す
  if (startIndex === -1) {
    return [endId];
  }

  const lowerIndex = Math.min(startIndex, endIndex);
  const upperIndex = Math.max(startIndex, endIndex);

  return orderedIds.slice(lowerIndex, upperIndex + 1);
};

// hover / select 状態と選択起点を管理する
export const useSelection = () => {
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [selectedBy, setSelectedBy] = useState(null); // コンポーネント間で相互にやり取りをする際の起点を示す
  const [shiftSelectionStartId, setShiftSelectionStartId] = useState(null); // shiftクリックの範囲起点用
  const [scrollTargetId, setScrollTargetId] = useState(null); //　単一クリック的な動作はscroll対象とする
  const hover = useCallback((id) => {
    setHoveredId(id);
  }, []);

  const clearHovered = useCallback(() => setHoveredId(null), []);

  // 通常クリック：択一選択
  const replaceSelection = useCallback((id, by) => {
    setSelectedIds(new Set([id]));
    setShiftSelectionStartId(id);
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
    setShiftSelectionStartId(id);
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
    shiftSelectionStartId,
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
