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
  pageNumberByPageId,
  page,
  maxPage,
  zoom,
  zoomStep,
  minZoom,
  maxZoom,
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
        content: contentDraftById[w.id] ?? w.content ?? "",
      }));
  };
  const addPendingPostByBbox = (pageId, bbox, direction) => {
    const pageNumber = pageNumberByPageId.get(String(pageId));

    const previewWord = {
      id: `preview:${crypto.randomUUID()}`,
      isPendingPost: true,
      page: pageId,
      bbox,
      direction,
      content: "",
      page__page_number: pageNumber,
    };

    queryClient.setQueryData(wordsQueryKey, (oldWords = []) => [
      ...oldWords,
      previewWord,
    ]);

    historyDispatch({
      type: "PUSH",
      entry: {
        type: "ADD_PENDING_POST",
        payload: { word: previewWord },
      },
    });
  };

  const changeContentDraftById = (wordId, nextContent, prevContent) => {
    if (prevContent === nextContent) return;
    historyDispatch({
      type: "PUSH",
      entry: {
        type: "CHANGE_CONTENT_DRAFT",
        payload: { wordId, prev: prevContent, next: nextContent },
      },
    });
    setContentDraftById((prev) => ({ ...prev, [wordId]: nextContent }));
  };

  const addPendingDeleteById = (wordId) => {
    let deletedWord = null;
    queryClient.setQueryData(wordsQueryKey, (oldWords = []) => {
      deletedWord = oldWords.find((w) => w.id === wordId) ?? null;
      return oldWords.filter((w) => w.id !== wordId);
    });
    if (!deletedWord) return;

    setPendingDeleteIdSet((state) => {
      const next = new Set(state);
      next.add(deletedWord.id);
      return next;
    });

    historyDispatch({
      type: "PUSH",
      entry: {
        type: "ADD_PENDING_DELETE",
        payload: {
          word: deletedWord,
        },
      },
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
    [...historyState.past].reverse().forEach((entry) => {
      switch (entry.type) {
        case "ADD_PENDING_DELETE": {
          const { word } = entry.payload;
          queryClient.setQueryData(wordsQueryKey, (oldWords = []) => {
            if (oldWords.some((w) => w.id === word.id)) return oldWords;
            return [...oldWords, word];
          });
          return;
        }
        case "ADD_PENDING_POST": {
          const { word } = entry.payload;
          queryClient.setQueryData(wordsQueryKey, (oldWords = []) => {
            return oldWords.filter((w) => w.id !== word.id);
          });
          return;
        }
        default:
          return;
      }
    });
    setIsEditing(false);
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

      case "ADD_PENDING_DELETE": {
        const { word } = entry.payload;
        queryClient.setQueryData(wordsQueryKey, (oldWords = []) => {
          if (oldWords.some((w) => w.id === word.id)) return oldWords;
          return [...oldWords, word];
        });
        setPendingDeleteIdSet((state) => {
          const next = new Set(state);
          next.delete(word.id);
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

      case "ADD_PENDING_DELETE": {
        const { word } = entry.payload;
        queryClient.setQueryData(wordsQueryKey, (oldWords = []) =>
          oldWords.filter((w) => w.id !== word.id),
        );
        setPendingDeleteIdSet((state) => {
          const next = new Set(state);
          next.add(word.id);
          return next;
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

  const canUndo = historyState.past.length > 0;
  const canRedo = historyState.future.length > 0;
  const canGoPrevPage = page > 1;
  const canGoNextPage = page < maxPage;
  const canZoomOut = zoom - zoomStep >= minZoom;
  const canZoomIn = zoom + zoomStep <= maxZoom;

  return {
    isEditing,
    startEdit,
    saveEdit,
    cancelEdit,
    changeContentDraftById,
    addPendingDeleteById,
    addPendingPostByBbox,
    contentDraftById,
    canUndo,
    canRedo,
    canGoPrevPage,
    canGoNextPage,
    canZoomOut,
    canZoomIn,
    undo,
    redo,
  };
};
