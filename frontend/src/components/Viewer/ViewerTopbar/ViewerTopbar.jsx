import { AppBar, Toolbar, TextField } from "@mui/material";

const ViewerTopBar = ({
  data:{ page, zoom, rotate, setPage, setZoom, setRotate } = {}
  }) => {
  
  return (
    <AppBar color="default" position="static">
      <Toolbar> 
        <TextField 
          defaultValue={page}
          onKeyDown={(e) => {
          if (e.key !== "Enter") return;
            const n = Number(e.currentTarget.value); 
            setPage(n)
          }}>
        </TextField>

        <TextField>ページ数</TextField>
        <TextField>回転</TextField>
      </Toolbar>
    </AppBar>
    );

};

export default ViewerTopBar;