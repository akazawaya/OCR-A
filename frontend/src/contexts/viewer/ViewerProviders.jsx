import { useCallback, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";

import { useViewerPageState } from "../../hooks/ui/useViewerPageState";
import { useViewerWordState } from "../../hooks/ui/useViewerWordState";
import { useViewerEditState } from "../../hooks/ui/useViewerEditState.jsx";
import { useRefresh } from "../refreshContext";
import { patchCollectionItem } from "../../api/clients/mutationClient";

import { ViewerPageStateProvider } from "./ViewerPageStateContext";
import { ViewerWordStateProvider } from "./ViewerWordStateContext";
import { ViewerEditStateProvider } from "./ViewerEditStateContext";

// Viewer側でProviderを作って内部でhookを呼び、各Contextへvalue, eventを流す
// useReducerは状態更新ロジックをまとめたいときの状態管理手段なので、
// 現状としては、useViewerFooStateそれぞれがuseStateを知っていればそれで充分
export const ViewerProviders = ({
  pageRows = [],
  wordRows = [],
  wordUrl,
  children,
}) => {
  const pageState = useViewerPageState({ maxPage: pageRows.length });
  const pageData = useMemo(() => ({ rows: pageRows }), [pageRows]);
  const wordData = useMemo(() => ({ rows: wordRows }), [wordRows]);
  const wordState = useViewerWordState(pageData, wordData);
  const editState = useViewerEditState();
  const onRefresh = useRefresh();

  const pageStateValue = useMemo(
    () => ({
      values: {
        page: pageState.page,
        zoom: pageState.zoom,
        rotate: pageState.rotate,
        ZOOM_STEP: pageState.ZOOM_STEP,
        ROTATE_STEP: pageState.ROTATE_STEP,
      },
      events: {
        onClickPageStepButton: pageState.setPage,
        onClickZoomStepButton: pageState.setZoom,
        onClickRotateStepButton: pageState.setRotate,
        onEnterPageInput: pageState.commitPage,
        onEnterZoomInput: pageState.commitZoom,
        onEnterRotateInput: pageState.commitRotate,
      },
    }),
    [
      pageState.page,
      pageState.zoom,
      pageState.rotate,
      pageState.ZOOM_STEP,
      pageState.ROTATE_STEP,
      pageState.setPage,
      pageState.setZoom,
      pageState.setRotate,
      pageState.commitPage,
      pageState.commitZoom,
      pageState.commitRotate,
    ],
  );

  const wordStateValue = useMemo(
    () => ({
      values: {
        pageMetaById: wordState.pageMetaById,
        wordsByPageId: wordState.wordsByPageId,
        hoveredWordId: wordState.hoveredWordId,
        selectedWordId: wordState.selectedWordId,
        selectedBy: wordState.selectedBy,
      },
      events: {
        onHoverWord: wordState.hoverWord,
        onHoverClearWord: wordState.clearHoveredWord,
        onSelectWord: wordState.commitSelectWord,
      },
    }),
    [
      wordState.pageMetaById,
      wordState.wordsByPageId,
      wordState.hoveredWordId,
      wordState.selectedWordId,
      wordState.selectedBy,
      wordState.hoverWord,
      wordState.clearHoveredWord,
      wordState.commitSelectWord,
    ],
  );

  // saveEditにpatchDraftByIdをくっつけたいのでここで合成する
  const { mutate: patchDraftById } = useMutation({
    mutationFn: async (draftById) => {
      const snapshot = { ...(draftById ?? {}) };
      const entries = Object.entries(snapshot);
      for (const [wordId, content] of entries) {
        await patchCollectionItem({
          collectionUrl: wordUrl,
          id: wordId,
          body: { content },
        });
      }
      return entries.length;
    },
  });
  const saveAllEdits = useCallback(async () => {
    try {
      await patchDraftById(editState.draftById);
      editState.saveEdit(); // 成功したときだけドラフトクリア
      onRefresh();
    } catch (e) {
      console.error("saveAllEdits failed", e);
    }
  }, [patchDraftById, editState.draftById, editState.saveEdit, onRefresh]);

  const editStateValue = useMemo(
    () => ({
      values: {
        isEditing: editState.isEditing,
        draftById: editState.draftById,
      },
      events: {
        onChangeDraftContent: editState.setDraftContent,
        onClickEditButton: editState.startEdit,
        onClickSaveButton: saveAllEdits,
        onClickCancelButton: editState.cancelEdit,
      },
    }),
    [
      editState.isEditing,
      editState.draftById,
      editState.setDraftContent,
      editState.startEdit,
      editState.saveEdit,
      editState.cancelEdit,
      saveAllEdits,
    ],
  );
  // childrenをラップすることで、内側にいるコンポーネントはuseContextでそれぞれのvalueを参照できる
  return (
    <ViewerPageStateProvider value={pageStateValue}>
      <ViewerWordStateProvider value={wordStateValue}>
        <ViewerEditStateProvider value={editStateValue}>
          {children}
        </ViewerEditStateProvider>
      </ViewerWordStateProvider>
    </ViewerPageStateProvider>
  );
};
