import { Button, AppBar, Toolbar } from "@mui/material";

const ViewerTopBar = () => {
  return (
    <AppBar color="default" position="static">
      <Toolbar> 
        <Button>拡大縮小</Button>
        <Button>ページ数</Button>
        <Button>回転</Button>
      </Toolbar>
    </AppBar>
    );

};

export default ViewerTopBar;