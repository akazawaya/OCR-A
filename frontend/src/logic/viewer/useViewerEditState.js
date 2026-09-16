// Edit,Save,Cancelのロジック用まとめのhook
import { useMemo, useReducer, useState, useEffect } from "react";
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
      const entry = state.past.at(-1);
      return {
        past: state.past.slice(0, -1),
        future: [...state.future, entry],
      };
    }

    case "REDO": {
      if (state.future.length === 0) return state;
      const entry = state.future.at(-1);
      return {
        past: [...state.past, entry],
        future: state.future.slice(0, -1),
      };
    }
    case "RESET":
      return initialHistoryState;
    default:
      return state;
  }
};

const applyWordChange = (words, removeWords, addWords) => {
  const removeWordIdSet = new Set(removeWords.map((word) => word.id));
  const addWordById = new Map(addWords.map((word) => [word.id, word]));
  const retainedOrReplacedWords = [];
  // 変更前のwords - removeWords + addWords = 変更後のwords として作業結果を構築する
  words.forEach((word) => {
    if (!removeWordIdSet.has(word.id)) {
      retainedOrReplacedWords.push(word); // retain(元のwordを維持)
    } else if (addWordById.has(word.id)) {
      // idがremoveかつadd対象の場合は置換とみなす
      retainedOrReplacedWords.push(addWordById.get(word.id)); // replace(元のwordを採用せず、同じ位置に更新後のwordを採用して置換)
      addWordById.delete(word.id);
    }
    // removeにだけ存在するwordは結果(retainedOrReplacedWords及び返り値配列)へ含めないことで削除を反映
  });
  // add対象のみのwordsはループ外処理となる。最後に返り値配列に追加する形で反映
  return [...retainedOrReplacedWords, ...addWordById.values()];
};

const patchableWordKeys = ["content", "direction", "det_score", "rec_score"];

const buildSaveChangesFromHistory = (pastEntries = []) => {
  const patchDraftMap = new Map(); // PATCHを作るための中間データ
  const pendingPostWordMap = new Map(); // 最終的なPOST予定
  const pendingDeleteIdSet = new Set(); // 最終的なDELETE予定
  // 各履歴を「変更前のwords - removeWords + addWords」として解釈し、POST・PATCH・DELETEへ集約する
  // Post/Deleteはただ変更内容を一方的に積めばいいことに対し、
  // patchは変更前/変更後を比較した後、変更があった内容だけ積む必要があるため、一層多い

  pastEntries.forEach((pastEntry) => {
    const { removeWords, addWords } = pastEntry;
    const removeWordById = new Map(removeWords.map((word) => [word.id, word]));
    removeWords.forEach((word) => {
      // addにも同じIDがあればpatchなので保留
      if (addWords.some((addedWord) => addedWord.id === word.id)) return;
      if (pendingPostWordMap.has(word.id)) {
        pendingPostWordMap.delete(word.id);
      } else {
        pendingDeleteIdSet.add(word.id);
      }
    });
    addWords.forEach((word) => {
      const removedWord = removeWordById.get(word.id);
      if (!removedWord || pendingPostWordMap.has(word.id)) {
        // removedWordとidが共存ではない → 単なるadd 新規POSTとして追加
        // pendingPostに既存 → pendingPostの上書きとして更新
        pendingPostWordMap.set(word.id, word); //setは新規追加と更新を兼ねる点に注意
        return;
      }
      const wordChange = patchDraftMap.get(word.id);
      // patchの変更は全履歴を処理し終えた最終結果で検証したいため、
      // originalで初回変更前の値を保持し、currentで最新の値を更新し、保持する。
      if (!wordChange) {
        patchDraftMap.set(word.id, {
          original: removedWord,
          current: word,
        });
      } else {
        wordChange.current = word;
      }
    });
  });

  const pendingPatchChangeMap = new Map(
    [...patchDraftMap.entries()]
      // PATCH対象項目に1つでも差分があるwordのエントリーだけを残す
      .filter(([, { original, current }]) =>
        patchableWordKeys.some((key) => original[key] !== current[key]),
      )
      // 各wordを「wordId → 変更された項目」のMapエントリーへ変換
      .map(([wordId, { original, current }]) => [
        wordId, // キー
        Object.fromEntries(
          patchableWordKeys
            .filter((key) => original[key] !== current[key])
            .map((key) => [key, current[key]]), // 値
        ),
      ]),
  );
  return { pendingPostWordMap, pendingDeleteIdSet, pendingPatchChangeMap };
};

export const useViewerEditState = ({
  postWordMutation,
  patchWordMutation,
  deleteWordMutation,
  ocrPreviewWordMutation,
  wordsQueryKey,
  pageNumberByPageId,
  previewJob,
}) => {
  const [isEditMode, setisEditMode] = useState(false);
  const [isOcring, setIsOcring] = useState(false);
  const [historyState, historyDispatch] = useReducer(
    historyReducer,
    initialHistoryState,
  );
  const { pendingPostWordMap, pendingDeleteIdSet, pendingPatchChangeMap } =
    useMemo(
      () => buildSaveChangesFromHistory(historyState.past),
      [historyState.past],
    );

  const queryClient = useQueryClient();

  const addPendingPostByBbox = (pageId, bbox, direction) => {
    if (isOcring) return;
    const pageNumber = pageNumberByPageId.get(String(pageId));

    const previewWord = {
      id: `preview:${crypto.randomUUID()}`,
      isPendingPost: true,
      page: pageId,
      bbox,
      direction,
      content: "",
      page__page_number: pageNumber,
      det_score: null,
      rec_score: null,
    };

    queryClient.setQueryData(wordsQueryKey, (oldWords = []) => [
      ...oldWords,
      previewWord,
    ]);

    historyDispatch({
      type: "PUSH",
      entry: {
        removeWords: [],
        addWords: [previewWord],
      },
    });

    return previewWord.id; // ドラッグで枠追加のとき、追加した仮Wordを選択状態にするためのreturn
  };

  const changeContentDraftById = (wordId, nextContent, prevContent) => {
    if (isOcring) return;
    if (prevContent === nextContent) return;
    let prevWord = null;
    let nextWord = null;

    queryClient.setQueryData(wordsQueryKey, (oldWords = []) =>
      oldWords.map((word) => {
        if (word.id !== wordId) return word;
        prevWord = { ...word, content: prevContent };
        nextWord = {
          ...word,
          content: nextContent,
          det_score: null,
          rec_score: null,
        };
        return nextWord;
      }),
    );
    if (!prevWord || !nextWord) return;
    // テキスト内容に手を加えた場合、信頼度スコアを無効化する
    historyDispatch({
      type: "PUSH",
      entry: {
        removeWords: [prevWord],
        addWords: [nextWord],
      },
    });
  };

  const addPendingDeleteByIds = (wordIds) => {
    if (isOcring) return;
    const wordIdSet = new Set(wordIds);
    let deletedWords = [];

    queryClient.setQueryData(wordsQueryKey, (oldWords = []) => {
      deletedWords = oldWords.filter((word) => wordIdSet.has(word.id));
      return oldWords.filter((word) => !wordIdSet.has(word.id));
    });
    if (deletedWords.length === 0) return;

    historyDispatch({
      type: "PUSH",
      entry: {
        removeWords: deletedWords,
        addWords: [],
      },
    });
  };

  const rewritePreviewWordContentByOcr = async (previewWord) => {
    if (isOcring) return;
    setIsOcring(true);
    try {
      await ocrPreviewWordMutation({
        previewWord,
        mode: "rewrite_content",
      });
    } catch {
      setIsOcring(false);
    }
  };

  const replacePreviewWordByOcr = async (previewWord) => {
    if (isOcring) return;
    setIsOcring(true);
    try {
      await ocrPreviewWordMutation({
        previewWord,
        mode: "replace_words",
      });
    } catch {
      setIsOcring(false);
    }
  };

  useEffect(() => {
    if (!previewJob) return;
    if (previewJob.state !== "SUCCESS") {
      setIsOcring(false);
      return;
    }
    const wordId = previewJob.preview_id;
    if (previewJob.mode === "rewrite_content") {
      // rewrite_contentはcontentとdirectionを置き換える
      let prevWord = null;
      queryClient.setQueryData(wordsQueryKey, (prevWords) => {
        return prevWords.map((word) => {
          if (String(word.id) !== String(wordId)) {
            return word;
          }
          prevWord = word;
          return {
            ...word,
            content: previewJob.content,
            direction: previewJob.direction,
            det_score: null,
            rec_score: null,
          };
        });
      });
      // rewrite_contenはbboxを人力入力に依存し、複数結果を結合するため、信頼度スコアは無効化する
      historyDispatch({
        type: "PUSH",
        entry: {
          removeWords: [prevWord],
          addWords: [
            {
              ...prevWord,
              content: previewJob.content,
              direction: previewJob.direction,
              det_score: null,
              rec_score: null,
            },
          ],
        },
      });
    }
    if (previewJob.mode === "replace_words") {
      const wordId = previewJob.preview_id;
      const oldWords = queryClient.getQueryData(wordsQueryKey);
      const removeWord = oldWords.find(
        (word) => String(word.id) === String(wordId),
      );
      if (previewJob.state !== "SUCCESS") {
        setIsOcring(false);
        return;
      }
      const removeWords = [removeWord];
      const addWords = previewJob.words
        .filter((word) => (word.content ?? "") !== "")
        .map((word) => ({
          id: `preview:${crypto.randomUUID()}`,
          isPendingPost: true,
          page: removeWord.page,
          page__page_number: removeWord.page__page_number,
          bbox: word.bbox,
          direction: word.direction,
          content: word.content,
          // replace_wordsはOCRエンジンそのものの返り値を使うため 信頼度スコアをそのまま採用する
          det_score: word.det_score,
          rec_score: word.rec_score,
        }));

      queryClient.setQueryData(wordsQueryKey, (oldWords) => {
        const removeWordIdSet = new Set(removeWords.map((word) => word.id));
        return [
          ...oldWords.filter((word) => !removeWordIdSet.has(word.id)),
          ...addWords,
        ];
      });
      historyDispatch({
        type: "PUSH",
        entry: {
          removeWords,
          addWords,
        },
      });
    }
    setIsOcring(false);
  }, [previewJob, queryClient, wordsQueryKey]);

  const applyUndoEntry = (entry) => {
    const { removeWords, addWords } = entry;
    queryClient.setQueryData(wordsQueryKey, (oldWords = []) =>
      applyWordChange(oldWords, addWords, removeWords),
    );
  };

  const applyRedoEntry = (entry) => {
    const { removeWords, addWords } = entry;
    queryClient.setQueryData(wordsQueryKey, (oldWords = []) =>
      applyWordChange(oldWords, removeWords, addWords),
    );
  };

  const startEdit = () => {
    setisEditMode(true);
  };

  const isPreviewId = (id) =>
    typeof id === "string" && id.startsWith("preview:");

  const saveEdit = () => {
    if (isOcring) return;
    const postPayload = [...pendingPostWordMap.values()].map((w) => ({
      pageId: w.page,
      bbox: w.bbox,
      direction: w.direction,
      content: w.content ?? "",
      // scoreはnullの時評価値がfalseとなるため、直で真偽値を評価する
      det_score: w.det_score ?? null,
      rec_score: w.rec_score ?? null,
    }));

    const deleteIds = [...pendingDeleteIdSet].filter((id) => !isPreviewId(id));
    const deleteIdSet = new Set([...pendingDeleteIdSet].map(String));

    const patchPayload = Object.fromEntries(
      [...pendingPatchChangeMap.entries()].filter(([id]) => {
        return !isPreviewId(id) && !deleteIdSet.has(String(id));
      }),
    );

    postWordMutation(postPayload);
    patchWordMutation(patchPayload);
    deleteWordMutation(deleteIds);
    setisEditMode(false);
    historyDispatch({ type: "RESET" });
  };

  const cancelEdit = () => {
    if (isOcring) return;
    [...historyState.past].reverse().forEach((entry) => applyUndoEntry(entry));
    setisEditMode(false);
    historyDispatch({ type: "RESET" });
  };

  const undo = () => {
    if (!isEditMode || isOcring) return;
    const entry = historyState.past.at(-1);
    if (!entry) return;
    applyUndoEntry(entry);
    historyDispatch({ type: "UNDO" });
  };

  const redo = () => {
    if (!isEditMode || isOcring) return;
    const entry = historyState.future[0];
    if (!entry) return;
    applyRedoEntry(entry);
    historyDispatch({ type: "REDO" });
  };

  const canUndo = isEditMode && historyState.past.length > 0;
  const canRedo = isEditMode && historyState.future.length > 0;

  return {
    isEditMode,
    isOcring,
    startEdit,
    saveEdit,
    cancelEdit,
    changeContentDraftById,
    addPendingDeleteByIds,
    addPendingPostByBbox,
    replacePreviewWordByOcr,
    rewritePreviewWordContentByOcr,
    canUndo,
    canRedo,
    undo,
    redo,
  };
};
