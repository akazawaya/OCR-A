import { useState } from "react";
// Edit,Save,Cancelのロジック用まとめのhook

export const useViewerEditState = ({
  patchWordContentById,
  deleteWordById,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [contentDraftById, setContentDraftById] = useState({});
  const [pendingDeleteIdSet, setPendingDeleteIdSet] = useState(new Set());

  // Table側でのonChangeに合わせてこれを呼ぶ
  // 外部からchangeのみを実行可能なようにsetのラッパーのみを返す
  const changeContentDraftById = (wordId, nextContent) => {
    setContentDraftById((prev) => ({ ...prev, [wordId]: nextContent }));
  };

  const addPendingDeleteId = (wordId) => {
    setPendingDeleteIdSet((prev) => {
      const next = new Set(prev);
      next.add(wordId);
      return next;
    });
  };

  const startEdit = () => {
    setIsEditing(true);
  };

  const saveEdit = () => {
    patchWordContentById(contentDraftById);
    deleteWordById([...pendingDeleteIdSet]);
    setIsEditing(false);
    setContentDraftById({});
    setPendingDeleteIdSet(new Set());
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setContentDraftById({});
    setPendingDeleteIdSet(new Set());
  };

  return {
    isEditing,
    contentDraftById,
    pendingDeleteIdSet,
    changeContentDraftById,
    addPendingDeleteId,
    startEdit,
    saveEdit,
    cancelEdit,
  };
};
