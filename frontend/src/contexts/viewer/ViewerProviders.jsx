import { useMemo } from "react";

import { useViewerPageState } from "../../hooks/ui/useViewerPageState";
import { useViewerWordState } from "../../hooks/ui/useViewerWordState";
import { useViewerEditState } from "../../hooks/ui/useViewerEditState.jsx";
import { useRefresh } from "../refreshContext";

import { ViewerPageStateProvider } from "./ViewerPageStateContext";
import { ViewerWordStateProvider } from "./ViewerWordStateContext";
import { ViewerEditStateProvider } from "./ViewerEditStateContext";

// Viewer側でProviderを作って内部でhookを呼び、各Contextへvalue, eventを流す
// useReducerは状態更新ロジックをまとめたいときの状態管理手段なので、
// 現状としては、useViewerFooStateそれぞれがuseStateを知っていればそれで充分
export const ViewerProviders = ({
  pageRows = [],
  wordRows = [],
  children,
  commitDraftById,
}) => {
  const pageState = useViewerPageState({ maxPage: pageRows.length });
  const pageData = useMemo(() => ({ rows: pageRows }), [pageRows]);
  const wordData = useMemo(() => ({ rows: wordRows }), [wordRows]);
  const wordState = useViewerWordState(pageData, wordData);
  const onRefresh = useRefresh();
  const editState = useViewerEditState({ commitDraftById, onRefresh });

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

  const editStateValue = useMemo(
    () => ({
      values: {
        isEditing: editState.isEditing,
        draftById: editState.draftById,
      },
      events: {
        onChangeDraftContent: editState.setDraftContent,
        onClickEditButton: editState.startEdit,
        onClickSaveButton: editState.saveEdit,
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
