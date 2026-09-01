import { useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ZoomOut,
  ZoomIn,
  RotateCw,
  Printer,
  Pencil,
  Undo2,
  Redo2,
  Save,
  Settings,
  X,
} from "lucide-react";

import {
  VIEWER_ZOOM,
  VIEWER_ROTATE_STEP,
} from "../../../logic/viewer/viewerPageConstants";
import { usePointerDownOutside } from "../../../logic/layout/usePointerDownOutside";

import { ViewerEditToolbar } from "./ViewerEditToolbar";
import { ViewerIconButton } from "./ViewerIconButton";
import { ViewerOptionsPanel } from "./ViewerOptionsPanel";

const renderTextField = (foo, commitFoo, inputRef, ariaLabel, disabled) => (
  // 外部の foo が変わったときにinputRef.current.value = ... で表示を同期
  <input
    ref={inputRef}
    aria-label={ariaLabel}
    className="w-[3ch] border border-double border-black bg-white text-center disabled:cursor-not-allowed disabled:opacity-50"
    defaultValue={foo}
    disabled={disabled}
    onBlur={(e) => {
      const display = commitFoo(e.currentTarget.value);
      if (display != null) e.currentTarget.value = display;
    }}
    onKeyDown={(e) => {
      if (e.key !== "Enter") return;
      if (e.isComposing) return;
      // commitFoo側の整合化によりstateが変わらず、表示更新が発生しないことを避けるために
      // EnterのタイミングcommitFoo の返り値をinputに書き戻す
      const display = commitFoo(e.currentTarget.value);
      if (display != null) e.currentTarget.value = display;
    }}
  />
);

const ViewerTopBar = ({
  data: {
    maxPage,
    page,
    zoom,
    rotate,
    isEditMode,
    canUndo = false,
    canRedo = false,
    canGoPrevPage = false,
    canGoNextPage = false,
    canZoomOut = false,
    canZoomIn = false,
    isOcring = false,
    isPrintMode = false,
    isOptionsPanelOpen = false,
  } = {},
  actions: {
    openPrintDialog,
    startEdit,
    saveEdit,
    cancelEdit,
    undo,
    redo,
    setPage,
    setZoom,
    setRotate,
    toggleOptionsPanel,
    closeOptionsPanel,
    commitPage,
    commitZoom,
    commitRotate,
  } = {},
  viewerEditToolbarData = {},
  viewerEditToolbarActions,
  viewerOptionsPanelData,
  viewerOptionsPanelActions,
} = {}) => {
  // useRef(null)はfooRef.currentというプロパティを作成
  // fooRef.currentに入るのがDOMの <input> 要素になったとき、そのDOM要素がvalueプロパティを持つ
  const pageRef = useRef(null);
  const zoomRef = useRef(null);
  const rotateRef = useRef(null);
  const optionsMenuRef = usePointerDownOutside({
    enable: isOptionsPanelOpen,
    onPointerDownOutside: closeOptionsPanel,
  });

  useEffect(() => {
    // 外部更新との連動にはinputRef.current.valueの書き換えが必要
    pageRef.current.value = page;
    zoomRef.current.value = zoom;
    rotateRef.current.value = rotate;
  }, [page, zoom, rotate]);

  const isBaseDisabled = isOcring || isPrintMode;
  return (
    <div className="relative border bg-gray-200">
      <div className="flex items-center justify-center gap-5 px-2 py-1">
        <div className="flex items-center gap-0.5">
          <ViewerIconButton
            disabled={isBaseDisabled || !canGoPrevPage}
            icon={ChevronLeft}
            label="前のページ"
            onClick={() => setPage((a) => a - 1)}
          />
          {renderTextField(page, commitPage, pageRef, "page", isBaseDisabled)}/{" "}
          {maxPage}
          <ViewerIconButton
            disabled={isBaseDisabled || !canGoNextPage}
            icon={ChevronRight}
            label="次のページ"
            onClick={() => setPage((a) => a + 1)}
          />
        </div>
        <div className="flex items-center gap-0.5">
          <ViewerIconButton
            disabled={isBaseDisabled || !canZoomOut}
            icon={ZoomOut}
            label="縮小"
            onClick={() => setZoom((a) => a - VIEWER_ZOOM.STEP)}
          />
          {renderTextField(zoom, commitZoom, zoomRef, "zoom", isBaseDisabled)}
          <ViewerIconButton
            disabled={isBaseDisabled || !canZoomIn}
            icon={ZoomIn}
            label="拡大"
            onClick={() => setZoom((a) => a + VIEWER_ZOOM.STEP)}
          />
        </div>
        <div className="flex items-center gap-0.5">
          <ViewerIconButton
            disabled={isBaseDisabled}
            icon={RotateCw}
            label="回転"
            onClick={() => setRotate((a) => a + VIEWER_ROTATE_STEP)}
          />
          {renderTextField(
            rotate,
            commitRotate,
            rotateRef,
            "rotate",
            isBaseDisabled,
          )}
        </div>
        <div ref={optionsMenuRef} className="flex">
          <ViewerIconButton
            disabled={isBaseDisabled}
            icon={Settings}
            label="表示設定"
            onClick={toggleOptionsPanel}
          />
          {isOptionsPanelOpen && (
            <ViewerOptionsPanel
              actions={viewerOptionsPanelActions}
              data={viewerOptionsPanelData}
            />
          )}
        </div>
        {!isEditMode ? (
          <ViewerIconButton
            disabled={isBaseDisabled}
            icon={Printer}
            label="出力"
            onClick={openPrintDialog}
          />
        ) : (
          <></>
        )}
        {!isEditMode ? (
          <ViewerIconButton
            disabled={isBaseDisabled}
            icon={Pencil}
            label="編集"
            onClick={startEdit}
          />
        ) : (
          <>
            <div className="flex items-center gap-0.5">
              <ViewerIconButton
                disabled={isBaseDisabled || !canUndo}
                icon={Undo2}
                label="元に戻す"
                onClick={undo}
              />
              <ViewerIconButton
                disabled={isBaseDisabled || !canRedo}
                icon={Redo2}
                label="やり直す"
                onClick={redo}
              />
            </div>
            <div className="flex items-center gap-2">
              <ViewerIconButton
                disabled={isBaseDisabled}
                icon={Save}
                label="保存"
                onClick={saveEdit}
              />
              <ViewerIconButton
                disabled={isBaseDisabled}
                icon={X}
                label="中止"
                onClick={cancelEdit}
              />
            </div>
          </>
        )}
        {isOcring && (
          <span className="text-sm text-gray-600" role="status">
            OCR実行中...
          </span>
        )}
      </div>
      {isEditMode && (
        <ViewerEditToolbar
          actions={viewerEditToolbarActions}
          data={{ ...viewerEditToolbarData, isOcring }}
        />
      )}
    </div>
  );
};

export default ViewerTopBar;
