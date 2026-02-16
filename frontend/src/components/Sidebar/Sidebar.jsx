import { Drawer } from "@mui/material";
import { Link } from "react-router-dom";

import { routePaths } from "../../appConfig";

import styles from "./Sidebar.module.css";

const Sidebar = () => {
  return (
    <Drawer
      variant="permanent" // MUI のDrawerはそれそのままでsidebar的なUIをサポートする　permanentは常に表示の意(これはjsx側に置く必要がある)
      className={styles.drawerRoot}
    >
      <Link to={routePaths.docs()}>Home</Link>
    </Drawer>
  );
};

export default Sidebar;
