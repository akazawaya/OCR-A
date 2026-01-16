import { AppBar, Toolbar, TextField, Button } from "@mui/material";
import { useEffect, useRef } from "react";
import { useViewerPageStateContext } from "../../../contexts/viewer/ViewerPageStateContext";
import { useViewerEditStateContext } from "../../../contexts/viewer/ViewerEditStateContext";


const renderTextField = (foo, commitFoo, inputRef) => ( 
  // draftでの制御形式は、stateを制御するためのstateというのも変に感じるので、inputRefでの非制御形式を試す
  // 外部の foo が変わったときにinputRef.current.value = ... で表示を同期
  // useRefは再レンダーを起こさずに値を保持できる（=バックエンドが保持する必要のない値に対して有効）　ref,inputRefを引数に持つDOM,MUIコンポーネントに対しては「参照」先として指定できる
  <TextField
    inputRef={inputRef}
    defaultValue={foo}
    onKeyDown={(e) => {
      if (e.key !== "Enter") return; //  return何もなし　でその処理を打ち切る意味になる
      // commitFoo側の整合化によりstateが変わらず、表示更新が発生しないことを避けるために
      // EnterのタイミングcommitFoo の返り値をinputに書き戻す 
      const display = commitFoo(e.target.value);
      if (display != null) e.target.value = display;
  }}/> 
); 


export default function ViewerTopBar (){ 
  const viewerPageState = useViewerPageStateContext();
  const viewerEditState = useViewerEditStateContext();
  const {
    values: { page, zoom, rotate, ZOOM_STEP, ROTATE_STEP } = {},
    events: {
      onPageChange,
      onZoomChange,
      onRotateChange,
      onPageCommit,
      onZoomCommit,
      onRotateCommit,
    } = {},
  } = viewerPageState;

  const {
    values: {isEditing},
    events: {
      onClickEditButton, 
      onClickSaveButton, 
      onClickCancelButton,
    }
  } = viewerEditState
  
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
  <AppBar color="default" position="static">
    <Toolbar>

      <Button onClick={() => onPageChange(a => a - 1)}>戻</Button>
      {renderTextField(page, onPageCommit, pageRef)} {/*parseIntは文字列の先頭から整数として読める部分を数字として読む　第二引数は10進数で解釈するという意味*/}
      <Button onClick={() => onPageChange(a => a + 1)}>次</Button>

      <Button onClick={() => onZoomChange(a => a - ZOOM_STEP)}>縮小</Button>
      {renderTextField(zoom, onZoomCommit, zoomRef)} 
      <Button onClick={() => onZoomChange(a => a + ZOOM_STEP)}>拡大</Button>
      
      <Button onClick={() => onRotateChange(a => a + ROTATE_STEP)}>回転</Button>
      {renderTextField(rotate, onRotateCommit, rotateRef)}


      {!isEditing ? (
        <Button onClick={onClickEditButton}>編集</Button>
        ) : (
        <>
        <Button onClick={onClickSaveButton}>保存</Button>
        <Button onClick={onClickCancelButton}>中止</Button>
        </>
      )}


    </Toolbar> 
  </AppBar> 
  )}; 
  
