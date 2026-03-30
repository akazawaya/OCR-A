import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
// Edit,Save,Cancelのロジック用まとめのhook

export const useViewerEditState = ({
  postWordByBbox,
  patchWordContentById,
  deleteWordById,
  wordsQueryKey,
}) => {
  const queryClient = useQueryClient();
  const buildPendingPostPayload = () => {
    const words = queryClient.getQueryData(wordsQueryKey);
    if (!Array.isArray(words)) return [];

    return words
      .filter((w) => w.isPendingPost)
      .map((w) => ({
        pageId: w.page,
        bbox: w.bbox,
        direction: w.direction,
      }));
  };
  const [isEditing, setIsEditing] = useState(false);

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
    queryClient.setQueryData(wordsQueryKey, (oldWords) => {
      if (!Array.isArray(oldWords)) return oldWords;

      const nextDisplayId =
        Math.max(0, ...oldWords.map((w) => w.displayId ?? w.id ?? 0)) + 1;

      const previewWord = {
        id: null,
        uiId: `preview:${crypto.randomUUID()}`,
        displayId: nextDisplayId,
        isPendingPost: true,
        page: pageId,
        bbox,
        direction,
        content: "",
      };

      return [...oldWords, previewWord];
    });
  };
  const startEdit = () => {
    setIsEditing(true);
  };

  const saveEdit = () => {
    const pendingPostPayload = buildPendingPostPayload();
    postWordByBbox(pendingPostPayload);

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
    addPendingPostByBbox,
    changeContentDraftById,
    togglePendingDeleteId,
    startEdit,
    saveEdit,
    cancelEdit,
  };
};
