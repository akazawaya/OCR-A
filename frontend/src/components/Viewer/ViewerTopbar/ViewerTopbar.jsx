import { AppBar, Toolbar, TextField } from "@mui/material";

const renderTextField = (foo, setFoo, parser) => ( 
  // 第三引数parserはパースする関数を入れる 
  <TextField defaultValue={foo} onKeyDown={
    (e) => { if (e.key !== "Enter") return; //  return何もなし　でその処理を打ち切る意味になる
    const next = parser(e.currentTarget.value); 
    if (!Number.isFinite(next)) return; 
    setFoo(next);
  }}/> 
); 

const ViewerTopBar = ({ 
  data:{ page, zoom, rotate, setPage, setZoom, setRotate } = {} 
  }) => { 
  return ( 
  <AppBar color="default" position="static">
    <Toolbar>
      {renderTextField(page, setPage, (s) => parseInt(s, 10))} {/*parseIntは文字列の先頭から整数として読める部分を数字として読む　第二引数は10進数で解釈するという意味*/}
      {renderTextField(zoom, setZoom, (s) => parseFloat(s))} 
      {renderTextField(rotate, setRotate, (s) => parseInt(s, 10))}
    </Toolbar> 
  </AppBar> 
  )}; 
export default ViewerTopBar;
