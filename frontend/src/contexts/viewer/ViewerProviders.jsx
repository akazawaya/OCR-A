import { useMemo } from "react";
import { useViewerPageState } from "../../hooks/ui/useViewerPageState";
import { useViewerWordState } from "../../hooks/ui/useViewerWordState";
import { useViewerEditState } from "../../hooks/ui/useViewerEditState.jsx";
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
}) => {
  const pageState = useViewerPageState({ maxPage: pageRows.length });
  const pageData = useMemo(() => ({ rows: pageRows }), [pageRows]);
  const wordData = useMemo(() => ({ rows: wordRows }), [wordRows]);
  const wordState = useViewerWordState(pageData, wordData);
  const editState = useViewerEditState();

  const pageStateValue = useMemo(() => ({
    values: {
      page: pageState.page,
      zoom: pageState.zoom,
      rotate: pageState.rotate,
      ZOOM_STEP: pageState.ZOOM_STEP,
      ROTATE_STEP: pageState.ROTATE_STEP,
    },
    events: {
      onPageChange: pageState.setPage,
      onZoomChange: pageState.setZoom,
      onRotateChange: pageState.setRotate,
      onPageCommit: pageState.commitPage,
      onZoomCommit: pageState.commitZoom,
      onRotateCommit: pageState.commitRotate,
    },
  }), [
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
  ]);

  const wordStateValue = useMemo(() => ({
    values: {
      pageMetaById: wordState.pageMetaById,
      wordsByPageId: wordState.wordsByPageId,
      hoveredWordId: wordState.hoveredWordId,
      selectedWordId: wordState.selectedWordId,
      selectedBy: wordState.selectedBy,
    },
    events: {
      onWordHover: wordState.hoverWord,
      onWordHoverClear: wordState.clearHoveredWord,
      onWordSelect: wordState.commitSelectWord,
    },
  }), [
    wordState.pageMetaById,
    wordState.wordsByPageId,
    wordState.hoveredWordId,
    wordState.selectedWordId,
    wordState.selectedBy,
    wordState.hoverWord,
    wordState.clearHoveredWord,
    wordState.commitSelectWord,
  ]);

  return (
    <ViewerPageStateProvider value={pageStateValue}>
      <ViewerWordStateProvider value={wordStateValue}>
        {children}
      </ViewerWordStateProvider>
    </ViewerPageStateProvider>
  );
};
