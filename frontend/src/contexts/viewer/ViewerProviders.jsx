import { useMemo } from "react";

import { useViewerPageState } from "../../logic/ui/useViewerPageState";
import { useViewerWordState } from "../../logic/ui/useViewerWordState";
import { useViewerEditState } from "../../logic/ui/useViewerEditState";
import { useDragRectState } from "../../logic/drag/useDragRectState";

import { ViewerPageStateProvider } from "./ViewerPageStateContext";
import { ViewerWordStateProvider } from "./ViewerWordStateContext";
import { ViewerEditStateProvider } from "./ViewerEditStateContext";
import { ViewerDragRectStateProvider } from "./ViewerDragRectStateContext";

// Viewer側でProviderを作って内部でhookを呼び、各Contextへvalue, eventを流す
// useReducerは状態更新ロジックをまとめたいときの状態管理手段なので、
// 現状としては、useViewerFooStateそれぞれがuseStateを知っていればそれで充分
export const ViewerProviders = ({
  data: { pages = [], words = [], wordsQueryKey } = {},
  children,
  mutations: { postWordByBbox, patchWordContentById, deleteWordById } = {},
  pageState: externalPageState,
}) => {
  const internalPageState = useViewerPageState({ maxPage: pages.length });
  const pageState = externalPageState ?? internalPageState;
  const wordState = useViewerWordState({ pages, words });
  const editState = useViewerEditState({
    postWordByBbox,
    patchWordContentById,
    deleteWordById,
    wordsQueryKey,
  });

  const pageStateValue = useMemo(
    () => ({
      data: {
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
      data: {
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

  const editStateValue = useMemo(
    () => ({
      data: {
        isEditing: editState.isEditing,
        contentDraftById: editState.contentDraftById,
        pendingDeleteIdSet: editState.pendingDeleteIdSet,
      },
      events: {
        onClickEditButton: editState.startEdit,
        onClickSaveButton: editState.saveEdit,
        onClickCancelButton: editState.cancelEdit,
        onAddPendingPostByBbox: editState.addPendingPostByBbox,
        onChangeContentDraft: editState.changeContentDraftById,
        onClickDeleteButton: editState.togglePendingDeleteId,
        onKeyDownUndo: editState.undo,
        onKeyDownRedo: editState.redo,
      },
    }),
    [
      editState.isEditing,
      editState.contentDraftById,
      editState.pendingDeleteIdSet,
      editState.startEdit,
      editState.saveEdit,
      editState.cancelEdit,
      editState.addPendingPostByBbox,
      editState.changeContentDraftById,
      editState.togglePendingDeleteId,
      editState.undo,
      editState.redo,
    ],
  );

  const dragRectState = useDragRectState();

  const dragRectStateValue = useMemo(
    () => ({
      data: {
        isDragging: dragRectState.data.isDragging,
        draftRect: dragRectState.data.draftRect,
      },
      events: {
        startDrag: dragRectState.events.startDrag,
        moveDrag: dragRectState.events.moveDrag,
        endDrag: dragRectState.events.endDrag,
        cancelDrag: dragRectState.events.cancelDrag,
      },
    }),
    [
      dragRectState.data.isDragging,
      dragRectState.data.draftRect,
      dragRectState.events.startDrag,
      dragRectState.events.moveDrag,
      dragRectState.events.endDrag,
      dragRectState.events.cancelDrag,
    ],
  );
  // childrenをラップすることで、内側にいるコンポーネントはuseContextでそれぞれのvalueを参照できる
  return (
    <ViewerPageStateProvider value={pageStateValue}>
      <ViewerWordStateProvider value={wordStateValue}>
        <ViewerEditStateProvider value={editStateValue}>
          <ViewerDragRectStateProvider value={dragRectStateValue}>
            {children}
          </ViewerDragRectStateProvider>
        </ViewerEditStateProvider>
      </ViewerWordStateProvider>
    </ViewerPageStateProvider>
  );
};
