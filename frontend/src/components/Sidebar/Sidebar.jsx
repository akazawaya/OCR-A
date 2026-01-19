import { Drawer } from "@mui/material";
import styles from "./Sidebar.module.css";
import { Link } from "react-router-dom";
import { routeTo } from "../../appConfig";

const Sidebar = () => {
  return (
    <Drawer
      variant="permanent" // MUI のDrawerはそれそのままでsidebar的なUIをサポートする　permanentは常に表示の意(これはjsx側に置く必要がある)
      className={styles.drawerRoot}
      >
      <Link to ={routeTo.docs()} >Home</Link>
      <Link to ={routeTo.docPages()} >出力一覧_ページごと</Link>
      <Link to ={routeTo.docPageWords()} >出力一覧_OCR一覧</Link>
    </Drawer>
    );

};

export default Sidebar;