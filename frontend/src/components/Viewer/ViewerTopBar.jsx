import { useEffect, useRef } from "react";

const renderTextField = (foo, commitFoo, inputRef, ariaLabel) => (
  // draftでの制御形式は、stateを制御するためのstateというのも変に感じるので、inputRefでの非制御形式を試す
  // 外部の foo が変わったときにinputRef.current.value = ... で表示を同期
  <input
    ref={inputRef}
    aria-label={ariaLabel}
    className="w-[3ch] border border-double border-black bg-white text-center"
    defaultValue={foo}
    onKeyDown={(e) => {
      if (e.key !== "Enter") return; //  return何もなし　でその処理を打ち切る意味になる
      // commitFoo側の整合化によりstateが変わらず、表示更新が発生しないことを避けるために
      // EnterのタイミングcommitFoo の返り値をinputに書き戻す
      const display = commitFoo(e.target.value);
      if (display != null) e.target.value = display;
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
  } = {},
  events: {
    onClickPrintButton,
    onClickEditButton,
    onClickSaveButton,
    onClickCancelButton,
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

  return (
    <div className="flex justify-center gap-2 bg-gray-200 px-2">
      <button onClick={() => onClickPageStepButton((a) => a - 1)}>戻</button>
      {renderTextField(page, onEnterPageInput, pageRef, "page")}/ {maxPage}
      <button onClick={() => onClickPageStepButton((a) => a + 1)}>次</button>
      <button onClick={() => onClickZoomStepButton((a) => a - ZOOM_STEP)}>
        縮小
      </button>
      {renderTextField(zoom, onEnterZoomInput, zoomRef, "zoom")}
      <button onClick={() => onClickZoomStepButton((a) => a + ZOOM_STEP)}>
        拡大
      </button>
      <button onClick={() => onClickRotateStepButton((a) => a + ROTATE_STEP)}>
        回転
      </button>
      {renderTextField(rotate, onEnterRotateInput, rotateRef, "rotate")}
      {!isEditing ? <button onClick={onClickPrintButton}>出力</button> : <></>}
      {!isEditing ? (
        <button onClick={onClickEditButton}>編集</button>
      ) : (
        <>
          <button onClick={onClickSaveButton}>保存</button>
          <button onClick={onClickCancelButton}>中止</button>
        </>
      )}
    </div>
  );
};

export default ViewerTopBar;
