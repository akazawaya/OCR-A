import { useState } from "react";
// Edit,Save,Cancelのロジック用まとめのhook

export const useViewerEditState = ({
  postWordByBbox,
  patchWordContentById,
  deleteWordById,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [pendingPostByBbox, setPendingPostByBbox] = useState([]);
  const [contentDraftById, setContentDraftById] = useState({});
  const [pendingDeleteIdSet, setPendingDeleteIdSet] = useState(new Set());

  // Table側でのonChangeに合わせてこれを呼ぶ
  // 外部からchangeのみを実行可能なようにsetのラッパーのみを返す
  const changeContentDraftById = (wordId, nextContent) => {
    setContentDraftById((prev) => ({ ...prev, [wordId]: nextContent }));
  };

  const togglePendingDeleteId = (wordId) => {
    setPendingDeleteIdSet((prev) => {
      const next = new Set(prev);
      if (next.has(wordId)) {
        next.delete(wordId);
      } else {
        next.add(wordId);
      }
      return next;
    });
  };

  const addPendingPostByBbox = (pageId, bbox, direction) => {
    setPendingPostByBbox((prev) => [...prev, { pageId, bbox, direction }]);
  };

  const startEdit = () => {
    setIsEditing(true);
  };

  const saveEdit = () => {
    postWordByBbox(pendingPostByBbox);
    patchWordContentById(contentDraftById);
    deleteWordById([...pendingDeleteIdSet]);
    setIsEditing(false);
    setPendingPostByBbox([]);
    setContentDraftById({});
    setPendingDeleteIdSet(new Set());
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setPendingPostByBbox([]);
    setContentDraftById({});
    setPendingDeleteIdSet(new Set());
  };

  return {
    isEditing,
    pendingPostByBbox,
    contentDraftById,
    pendingDeleteIdSet,
    addPendingPostByBbox,
    changeContentDraftById,
    togglePendingDeleteId,
    startEdit,
    saveEdit,
    cancelEdit,
  };
};
