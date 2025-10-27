import { Drawer } from "@mui/material";
import styles from "./Sidebar.module.css";
import { Link } from "react-router-dom";
import { routes } from "../../route";
const drawerWidth = 240;
const Sidebar = () => {
    return (
        <Drawer
            variant="permanent"
            sx={{
                width: drawerWidth,
                flexShrink: 0,
                "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box" },
            }}
        >
            <Link to ={routes.HOME} >Home</Link>
            <Link to ={routes.RESULT} >結果一覧</Link>
        </Drawer>
    );

};

export default Sidebar;