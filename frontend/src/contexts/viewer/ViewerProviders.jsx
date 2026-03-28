import { useMemo } from "react";

import { useViewerPageState } from "../../logic/ui/useViewerPageState";
import { useViewerWordState } from "../../logic/ui/useViewerWordState";
import { useViewerEditState } from "../../logic/ui/useViewerEditState";

import { ViewerPageStateProvider } from "./ViewerPageStateContext";
import { ViewerWordStateProvider } from "./ViewerWordStateContext";
import { ViewerEditStateProvider } from "./ViewerEditStateContext";

// Viewer側でProviderを作って内部でhookを呼び、各Contextへvalue, eventを流す
// useReducerは状態更新ロジックをまとめたいときの状態管理手段なので、
// 現状としては、useViewerFooStateそれぞれがuseStateを知っていればそれで充分
export const ViewerProviders = ({
  data: { pages = [], words = [] } = {},
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
      },
      events: {
        onClickEditButton: editState.startEdit,
        onClickSaveButton: editState.saveEdit,
        onClickCancelButton: editState.cancelEdit,
        // onDragRect的な: editState.addPendingPostByBbox
        onChangeContentDraft: editState.changeContentDraftById,
        onClickDeleteButton: editState.addPendingDeleteId,
      },
    }),
    [
      editState.isEditing,
      editState.contentDraftById,
      editState.changeContentDraftById,
      editState.addPendingDeleteId,
      editState.startEdit,
      editState.saveEdit,
      editState.cancelEdit,
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
