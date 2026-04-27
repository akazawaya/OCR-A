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
  X,
} from "lucide-react";

const renderTextField = (foo, commitFoo, inputRef, ariaLabel) => (
  // 外部の foo が変わったときにinputRef.current.value = ... で表示を同期
  <input
    ref={inputRef}
    aria-label={ariaLabel}
    className="w-[3ch] border border-double border-black bg-white text-center"
    defaultValue={foo}
    onBlur={(e) => {
      const display = commitFoo(e.currentTarget.value);
      if (display != null) e.currentTarget.value = display;
    }}
    onKeyDown={(e) => {
      if (e.key !== "Enter") return;
      if (e.nativeEvent.isComposing) return;
      // commitFoo側の整合化によりstateが変わらず、表示更新が発生しないことを避けるために
      // EnterのタイミングcommitFoo の返り値をinputに書き戻す
      const display = commitFoo(e.currentTarget.value);
      if (display != null) e.currentTarget.value = display;
    }}
  />
);

const ViewerTopBar = ({
  data: {
    maxPage = 1,
    page,
    zoom,
    rotate,
    ZOOM_STEP,
    ROTATE_STEP,
    isEditing,
    canUndo = false,
    canRedo = false,
    canGoPrevPage = false,
    canGoNextPage = false,
    canZoomOut = false,
    canZoomIn = false,
  } = {},
  events: {
    onClickPrintButton,
    onClickEditButton,
    onClickSaveButton,
    onClickCancelButton,
    onClickUndoButton,
    onClickRedoButton,
    onClickPageStepButton,
    onClickZoomStepButton,
    onClickRotateStepButton,
    onEnterPageInput,
    onEnterZoomInput,
    onEnterRotateInput,
  } = {},
} = {}) => {
  // useRef(null)はfooRef.currentというプロパティを作成
  // fooRef.currentに入るのがDOMの <input> 要素になったとき、そのDOM要素がvalueプロパティを持つ
  const pageRef = useRef(null);
  const zoomRef = useRef(null);
  const rotateRef = useRef(null);

  useEffect(() => {
    // 外部更新との連動にはinputRef.current.valueの書き換えが必要
    pageRef.current.value = page;
    zoomRef.current.value = zoom;
    rotateRef.current.value = rotate;
  }, [page, zoom, rotate]);

  const actionButtonClassName =
    "inline-flex h-8 w-5 items-center justify-center rounded-md border border-black bg-white cursor-pointer hover:bg-gray-100";
  const actionButtonDisabledStateClassName =
    "disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:hover:bg-gray-100";
  const actionButtonWithDisabledClassName = `${actionButtonClassName} ${actionButtonDisabledStateClassName}`;
  const iconClassName = "h-4 w-4";

  const renderIconButton = ({
    label,
    icon: Icon,
    className,
    disabled,
    onClick,
  }) => (
    <button
      aria-label={label}
      className={className}
      disabled={disabled}
      title={label}
      onClick={onClick}
    >
      <Icon className={iconClassName} />
    </button>
  );

  return (
    <div className="flex items-center justify-center gap-5 border bg-gray-200 px-2 py-1">
      <div className="flex items-center gap-0.5">
        {renderIconButton({
          label: "前のページ",
          icon: ChevronLeft,
          className: actionButtonWithDisabledClassName,
          disabled: !canGoPrevPage,
          onClick: () => onClickPageStepButton((a) => a - 1),
        })}
        {renderTextField(page, onEnterPageInput, pageRef, "page")}/ {maxPage}
        {renderIconButton({
          label: "次のページ",
          icon: ChevronRight,
          className: actionButtonWithDisabledClassName,
          disabled: !canGoNextPage,
          onClick: () => onClickPageStepButton((a) => a + 1),
        })}
      </div>
      <div className="flex items-center gap-0.5">
        {renderIconButton({
          label: "縮小",
          icon: ZoomOut,
          className: actionButtonWithDisabledClassName,
          disabled: !canZoomOut,
          onClick: () => onClickZoomStepButton((a) => a - ZOOM_STEP),
        })}
        {renderTextField(zoom, onEnterZoomInput, zoomRef, "zoom")}
        {renderIconButton({
          label: "拡大",
          icon: ZoomIn,
          className: actionButtonWithDisabledClassName,
          disabled: !canZoomIn,
          onClick: () => onClickZoomStepButton((a) => a + ZOOM_STEP),
        })}
      </div>
      <div className="flex items-center gap-0.5">
        {renderIconButton({
          label: "回転",
          icon: RotateCw,
          className: actionButtonClassName,
          onClick: () => onClickRotateStepButton((a) => a + ROTATE_STEP),
        })}
        {renderTextField(rotate, onEnterRotateInput, rotateRef, "rotate")}
      </div>
      {!isEditing ? (
        renderIconButton({
          label: "出力",
          icon: Printer,
          className: actionButtonClassName,
          onClick: onClickPrintButton,
        })
      ) : (
        <></>
      )}
      {!isEditing ? (
        renderIconButton({
          label: "編集",
          icon: Pencil,
          className: actionButtonClassName,
          onClick: onClickEditButton,
        })
      ) : (
        <>
          <div className="flex items-center gap-0.5">
            {renderIconButton({
              label: "元に戻す",
              icon: Undo2,
              className: actionButtonWithDisabledClassName,
              disabled: !canUndo,
              onClick: onClickUndoButton,
            })}
            {renderIconButton({
              label: "やり直す",
              icon: Redo2,
              className: actionButtonWithDisabledClassName,
              disabled: !canRedo,
              onClick: onClickRedoButton,
            })}
          </div>
          <div className="flex items-center gap-2">
            {renderIconButton({
              label: "保存",
              icon: Save,
              className: actionButtonClassName,
              onClick: onClickSaveButton,
            })}
            {renderIconButton({
              label: "中止",
              icon: X,
              className: actionButtonClassName,
              onClick: onClickCancelButton,
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default ViewerTopBar;
