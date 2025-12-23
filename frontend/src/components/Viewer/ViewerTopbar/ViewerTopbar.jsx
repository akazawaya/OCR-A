import { AppBar, Toolbar, TextField } from "@mui/material";

const renderTextField = (foo, commitFoo) => ( 
  // 第三引数parserはパースする関数を入れる 
  <TextField
    defaultValue={foo} 
    onKeyDown={(e) => {
      if (e.key !== "Enter") return; //  return何もなし　でその処理を打ち切る意味になる
      commitFoo(e.target.value);
  }}/> 
); 

export default function ViewerTopBar ( { viewer } = {}){ 
  const { page, zoom, rotate, commitPage, commitZoom, commitRotate } = viewer;
  return ( 
  <AppBar color="default" position="static">
    <Toolbar>
      {renderTextField(page, commitPage)} {/*parseIntは文字列の先頭から整数として読める部分を数字として読む　第二引数は10進数で解釈するという意味*/}
      {renderTextField(zoom, commitZoom)} 
      {renderTextField(rotate, commitRotate)}
    </Toolbar> 
  </AppBar> 
  )}; 
  
