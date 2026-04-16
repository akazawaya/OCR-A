import { useReducer, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
// Edit,Save,Cancelのロジック用まとめのhook

const initialHistoryState = {
  past: [],
  future: [],
};

const historyReducer = (state, action) => {
  switch (action.type) {
    case "PUSH":
      return {
        past: [...state.past, action.entry],
        future: [],
      };
    case "UNDO": {
      if (state.past.length === 0) return state;
      const entry = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        future: [entry, ...state.future],
      };
    }
    case "REDO": {
      if (state.future.length === 0) return state;
      const entry = state.future[0];
      return {
        past: [...state.past, entry],
        future: state.future.slice(1),
      };
    }
    case "RESET":
      return initialHistoryState;
    default:
      return state;
  }
};

export const useViewerEditState = ({
  postWordByBbox,
  patchWordContentById,
  deleteWordById,
  wordsQueryKey,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  // 編集中の差分管理:
  // patch / delete の pending は local state で保持する
  // post の pending は、未保存データを表示に反映するため query cache で保持する
  const [contentDraftById, setContentDraftById] = useState({});
  const [pendingDeleteIdSet, setPendingDeleteIdSet] = useState(new Set());
  const [historyState, historyDispatch] = useReducer(
    historyReducer,
    initialHistoryState,
  );

  const queryClient = useQueryClient();
  const buildPendingPostPayload = () => {
    const words = queryClient.getQueryData(wordsQueryKey);

    return words
      .filter((w) => w.isPendingPost)
      .map((w) => ({
        pageId: w.page,
        bbox: w.bbox,
        direction: w.direction,
      }));
  };
  const addPendingPostByBbox = (pageId, bbox, direction) => {
    queryClient.setQueryData(wordsQueryKey, (oldWords) => {
      const nextDisplayId =
        Math.max(0, ...oldWords.map((w) => w.displayId ?? w.id ?? 0)) + 1;

      const previewWord = {
        id: `preview:${crypto.randomUUID()}`,
        displayId: nextDisplayId,
        isPendingPost: true,
        page: pageId,
        bbox,
        direction,
        content: "",
      };

      historyDispatch({
        type: "PUSH",
        entry: {
          type: "ADD_PENDING_POST",
          payload: { word: previewWord },
        },
      });
      return [...oldWords, previewWord];
    });
  };

  const changeContentDraftById = (wordId, nextContent) => {
    setContentDraftById((prev) => {
      const prevContent = prev[wordId];
      historyDispatch({
        type: "PUSH",
        entry: {
          type: "CHANGE_CONTENT_DRAFT",
          payload: { wordId, prev: prevContent, next: nextContent },
        },
      });
      return { ...prev, [wordId]: nextContent };
    });
  };

  const togglePendingDeleteId = (wordId) => {
    setPendingDeleteIdSet((prev) => {
      const wasPendingDelete = prev.has(wordId);
      const willBePendingDelete = !wasPendingDelete;

      const next = new Set(prev);
      if (wasPendingDelete) {
        next.delete(wordId);
      } else {
        next.add(wordId);
      }

      historyDispatch({
        type: "PUSH",
        entry: {
          type: "SET_PENDING_DELETE",
          // 最終的にそのIDをどういう状態にしたかを表すため、TOGGLEではなくSETが相応しい
          payload: {
            wordId,
            prev: wasPendingDelete,
            next: willBePendingDelete,
          },
        },
      });

      return next;
    });
  };

  const startEdit = () => {
    setIsEditing(true);
  };

  const isPreviewId = (id) =>
    typeof id === "string" && id.startsWith("preview:");

  const saveEdit = () => {
    const pendingPostPayload = buildPendingPostPayload();
    const persistedContentDraftById = Object.fromEntries(
      Object.entries(contentDraftById).filter(([id]) => !isPreviewId(id)),
    );
    const persistedDeleteIds = [...pendingDeleteIdSet].filter(
      (id) => !isPreviewId(id),
    );

    postWordByBbox(pendingPostPayload);
    patchWordContentById(persistedContentDraftById);
    deleteWordById(persistedDeleteIds);
    setIsEditing(false);
    historyDispatch({ type: "RESET" });
    setContentDraftById({});
    setPendingDeleteIdSet(new Set());
  };

  const cancelEdit = () => {
    setIsEditing(false);
    queryClient.setQueryData(wordsQueryKey, (oldWords) => {
      return oldWords.filter((w) => !w.isPendingPost);
    });
    historyDispatch({ type: "RESET" });
    setContentDraftById({});
    setPendingDeleteIdSet(new Set());
  };

  const applyUndoEntry = (entry) => {
    switch (entry.type) {
      case "CHANGE_CONTENT_DRAFT": {
        const { wordId, prev } = entry.payload;
        setContentDraftById((state) => ({
          ...state,
          [wordId]: prev,
        }));
        return;
      }

      case "SET_PENDING_DELETE": {
        const { wordId, prev } = entry.payload;
        setPendingDeleteIdSet((state) => {
          const next = new Set(state);
          if (prev) next.add(wordId);
          else next.delete(wordId);
          return next;
        });
        return;
      }

      case "ADD_PENDING_POST": {
        const { word } = entry.payload;
        queryClient.setQueryData(wordsQueryKey, (oldWords) => {
          return oldWords.filter((w) => w.id !== word.id);
        });
        return;
      }

      default:
        return;
    }
  };

  const applyRedoEntry = (entry) => {
    switch (entry.type) {
      case "CHANGE_CONTENT_DRAFT": {
        const { wordId, next } = entry.payload;
        setContentDraftById((state) => ({
          ...state,
          [wordId]: next,
        }));
        return;
      }

      case "SET_PENDING_DELETE": {
        const { wordId, next } = entry.payload;
        setPendingDeleteIdSet((state) => {
          const nextSet = new Set(state);
          if (next) nextSet.add(wordId);
          else nextSet.delete(wordId);
          return nextSet;
        });
        return;
      }

      case "ADD_PENDING_POST": {
        const { word } = entry.payload;
        queryClient.setQueryData(wordsQueryKey, (oldWords) => {
          return [...oldWords, word];
        });
        return;
      }

      default:
        return;
    }
  };

  const undo = () => {
    const entry = historyState.past.at(-1);
    if (!entry) return;
    applyUndoEntry(entry);
    historyDispatch({ type: "UNDO" });
  };

  const redo = () => {
    const entry = historyState.future[0];
    if (!entry) return;
    applyRedoEntry(entry);
    historyDispatch({ type: "REDO" });
  };

  return {
    isEditing,
    startEdit,
    saveEdit,
    cancelEdit,
    changeContentDraftById,
    togglePendingDeleteId,
    addPendingPostByBbox,
    pendingDeleteIdSet,
    contentDraftById,
    undo,
    redo,
  };
};
