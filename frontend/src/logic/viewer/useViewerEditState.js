import { useMemo, useReducer, useState } from "react";
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

const buildSaveChangesFromHistory = (pastEntries = []) => {
  const patchStateById = new Map();
  const pendingPostWordMap = new Map();
  const pendingDeleteIdSet = new Set();

  pastEntries.forEach((pastEntry) => {
    switch (pastEntry.type) {
      case "ADD_PENDING_POST": {
        const { word } = pastEntry.payload;
        pendingPostWordMap.set(word.id, word);
        return;
      }
      case "CHANGE_CONTENT_DRAFT": {
        const { wordId, prev, next } = pastEntry.payload;
        if (pendingPostWordMap.has(wordId)) {
          const word = pendingPostWordMap.get(wordId);
          pendingPostWordMap.set(wordId, { ...word, content: next });
        }

        const contentChange = patchStateById.get(wordId);
        if (!contentChange) {
          patchStateById.set(wordId, { firstPrev: prev, lastNext: next });
        } else {
          contentChange.lastNext = next;
        }
        return;
      }
      case "ADD_PENDING_DELETE": {
        const { word } = pastEntry.payload;

        if (pendingPostWordMap.has(word.id)) {
          pendingPostWordMap.delete(word.id);
          return;
        }
        pendingDeleteIdSet.add(word.id);
        return;
      }
    }
  });

  const contentDraftById = Object.fromEntries(
    [...patchStateById.entries()]
      .filter(([, { firstPrev, lastNext }]) => firstPrev !== lastNext)
      .map(([wordId, { lastNext }]) => [wordId, lastNext]),
  );

  return { pendingPostWordMap, contentDraftById, pendingDeleteIdSet };
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
  const [historyState, historyDispatch] = useReducer(
    historyReducer,
    initialHistoryState,
  );
  const { pendingPostWordMap, pendingDeleteIdSet, contentDraftById } = useMemo(
    () => buildSaveChangesFromHistory(historyState.past),
    [historyState.past],
  );

  const queryClient = useQueryClient();

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
    queryClient.setQueryData(wordsQueryKey, (oldWords = []) =>
      oldWords.map((word) =>
        word.id === wordId ? { ...word, content: nextContent } : word,
      ),
    );

    historyDispatch({
      type: "PUSH",
      entry: {
        type: "CHANGE_CONTENT_DRAFT",
        payload: { wordId, prev: prevContent, next: nextContent },
      },
    });
  };

  const addPendingDeleteById = (wordId) => {
    let deletedWord = null;
    queryClient.setQueryData(wordsQueryKey, (oldWords = []) => {
      deletedWord = oldWords.find((w) => w.id === wordId) ?? null;
      return oldWords.filter((w) => w.id !== wordId);
    });
    if (!deletedWord) return;

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

  const applyUndoEntry = (entry) => {
    switch (entry.type) {
      case "CHANGE_CONTENT_DRAFT": {
        const { wordId, prev } = entry.payload;
        queryClient.setQueryData(wordsQueryKey, (oldWords = []) =>
          oldWords.map((word) =>
            word.id === wordId ? { ...word, content: prev } : word,
          ),
        );
        return;
      }
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
  };

  const applyRedoEntry = (entry) => {
    switch (entry.type) {
      case "CHANGE_CONTENT_DRAFT": {
        const { wordId, next } = entry.payload;
        queryClient.setQueryData(wordsQueryKey, (oldWords = []) =>
          oldWords.map((word) =>
            word.id === wordId ? { ...word, content: next } : word,
          ),
        );
        return;
      }
      case "ADD_PENDING_DELETE": {
        const { word } = entry.payload;
        queryClient.setQueryData(wordsQueryKey, (oldWords = []) =>
          oldWords.filter((w) => w.id !== word.id),
        );
        return;
      }
      case "ADD_PENDING_POST": {
        const { word } = entry.payload;
        queryClient.setQueryData(wordsQueryKey, (oldWords = []) => {
          if (oldWords.some((w) => w.id === word.id)) return oldWords;
          return [...oldWords, word];
        });
        return;
      }
      default:
        return;
    }
  };

  const startEdit = () => {
    setIsEditing(true);
  };

  const isPreviewId = (id) =>
    typeof id === "string" && id.startsWith("preview:");

  const saveEdit = () => {
    const postPayload = [...pendingPostWordMap.values()].map((w) => ({
      pageId: w.page,
      bbox: w.bbox,
      direction: w.direction,
      content: w.content ?? "",
    }));

    const deleteIds = [...pendingDeleteIdSet].filter((id) => !isPreviewId(id));
    const deleteIdSet = new Set([...pendingDeleteIdSet].map(String));

    const patchPayload = Object.fromEntries(
      Object.entries(contentDraftById).filter(([id]) => {
        return !isPreviewId(id) && !deleteIdSet.has(String(id));
      }),
    );

    postWordByBbox(postPayload);
    patchWordContentById(patchPayload);
    deleteWordById(deleteIds);
    setIsEditing(false);
    historyDispatch({ type: "RESET" });
  };

  const cancelEdit = () => {
    [...historyState.past].reverse().forEach((entry) => applyUndoEntry(entry));
    setIsEditing(false);
    historyDispatch({ type: "RESET" });
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
