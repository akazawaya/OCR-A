// Edit,Save,Cancelのロジック用まとめのhook
import { useMemo, useReducer, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

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

      case "REPLACE_WORDS": {
        const { removeWords, addWords } = pastEntry.payload;
        removeWords.forEach((word) => {
          if (pendingPostWordMap.has(word.id)) {
            pendingPostWordMap.delete(word.id);
          } else {
            pendingDeleteIdSet.add(word.id);
          }
        });
        addWords.forEach((word) => {
          pendingPostWordMap.set(word.id, word);
        });
        return;
      }
    }
  });

  const pendingPatchContentById = Object.fromEntries(
    [...patchStateById.entries()]
      .filter(([, { firstPrev, lastNext }]) => firstPrev !== lastNext)
      .map(([wordId, { lastNext }]) => [wordId, lastNext]),
  );

  return { pendingPostWordMap, pendingPatchContentById, pendingDeleteIdSet };
};

export const useViewerEditState = ({
  postWordByBbox,
  patchWordContentById,
  deleteWordById,
  ocrPreviewByPreviewWord,
  wordsQueryKey,
  pageNumberByPageId,
}) => {
  const [isEditMode, setisEditMode] = useState(false);
  const [historyState, historyDispatch] = useReducer(
    historyReducer,
    initialHistoryState,
  );
  const { pendingPostWordMap, pendingDeleteIdSet, pendingPatchContentById } =
    useMemo(
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

  const rewritePreviewWordContentByOcr = async (previewWord) => {
    const result = await ocrPreviewByPreviewWord({
      previewWord,
      mode: "rewrite_content",
    });
    const response = result.data ?? {};
    const nextContent =
      response.content ??
      response.words?.map((word) => word.content ?? "").join("") ??
      "";
    changeContentDraftById(
      previewWord.id,
      nextContent,
      previewWord.content ?? "",
    );
  };

  const replacePreviewWordByOcr = async (previewWord) => {
    const result = await ocrPreviewByPreviewWord({
      previewWord,
      mode: "replace_words",
    });
    const response = result.data ?? {};
    const addWords = (response.words ?? []).map((word) => ({
      id: `preview:${crypto.randomUUID()}`,
      isPendingPost: true,
      page: previewWord.page,
      page__page_number: previewWord.page__page_number,
      bbox: word.bbox,
      direction: word.direction,
      content: word.content ?? "",
    }));
    const payload = {
      removeWords: [previewWord],
      addWords,
    };
    applyReplaceWords(payload);
    // OCR結果を query cache に反映する
    historyDispatch({
      type: "PUSH",
      entry: {
        type: "REPLACE_WORDS",
        payload,
      },
    });
  };

  const applyReplaceWords = ({ removeWords, addWords }) => {
    queryClient.setQueryData(wordsQueryKey, (oldWords = []) => {
      const removeWordIdSet = new Set(removeWords.map((w) => w.id));
      const withoutRemovedWords = oldWords.filter(
        (word) => !removeWordIdSet.has(word.id),
      );
      const existingIdSet = new Set(withoutRemovedWords.map((w) => w.id));
      const nextAddWords = addWords.filter(
        (word) => !existingIdSet.has(word.id),
      );
      return [...withoutRemovedWords, ...nextAddWords];
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
      case "REPLACE_WORDS": {
        const { removeWords, addWords } = entry.payload;
        queryClient.setQueryData(wordsQueryKey, (oldWords = []) => {
          const addWordIdSet = new Set(addWords.map((w) => w.id));
          const withoutAddedWords = oldWords.filter(
            (word) => !addWordIdSet.has(word.id),
          );
          const existingIdSet = new Set(withoutAddedWords.map((w) => w.id));
          const restoredWords = removeWords.filter(
            (word) => !existingIdSet.has(word.id),
          );
          return [...withoutAddedWords, ...restoredWords];
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
      case "REPLACE_WORDS": {
        const { removeWords, addWords } = entry.payload;
        queryClient.setQueryData(wordsQueryKey, (oldWords = []) => {
          const removeWordIdSet = new Set(removeWords.map((w) => w.id));
          const withoutRemovedWords = oldWords.filter(
            (word) => !removeWordIdSet.has(word.id),
          );
          const existingIdSet = new Set(withoutRemovedWords.map((w) => w.id));
          const addedWords = addWords.filter(
            (word) => !existingIdSet.has(word.id),
          );
          return [...withoutRemovedWords, ...addedWords];
        });
        return;
      }
      default:
        return;
    }
  };

  const startEdit = () => {
    setisEditMode(true);
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
      Object.entries(pendingPatchContentById).filter(([id]) => {
        return !isPreviewId(id) && !deleteIdSet.has(String(id));
      }),
    );

    postWordByBbox(postPayload);
    patchWordContentById(patchPayload);
    deleteWordById(deleteIds);
    setisEditMode(false);
    historyDispatch({ type: "RESET" });
  };

  const cancelEdit = () => {
    [...historyState.past].reverse().forEach((entry) => applyUndoEntry(entry));
    setisEditMode(false);
    historyDispatch({ type: "RESET" });
  };

  const undo = () => {
    if (!isEditMode) return;
    const entry = historyState.past.at(-1);
    if (!entry) return;
    applyUndoEntry(entry);
    historyDispatch({ type: "UNDO" });
  };

  const redo = () => {
    if (!isEditMode) return;
    const entry = historyState.future[0];
    if (!entry) return;
    applyRedoEntry(entry);
    historyDispatch({ type: "REDO" });
  };

  const canUndo = isEditMode && historyState.past.length > 0;
  const canRedo = isEditMode && historyState.future.length > 0;

  return {
    isEditMode,
    startEdit,
    saveEdit,
    cancelEdit,
    changeContentDraftById,
    addPendingDeleteById,
    addPendingPostByBbox,
    replacePreviewWordByOcr,
    rewritePreviewWordContentByOcr,
    canUndo,
    canRedo,
    undo,
    redo,
  };
};
