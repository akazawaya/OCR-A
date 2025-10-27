import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Home from './pages/HomePage'
import Result from './pages/ResultPage'
import { Box } from "@mui/material";
import Sidebar from './components/Sidebar/Sidebar';
import { routes } from './route';
const drawerWidth = 240;
function App() {
  return (
    <BrowserRouter>
      <Box sx={{ display: "flex" }}>
        <Sidebar/>
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <Routes>
            <Route path={routes.HOME} element={<Home />} />
            <Route path={routes.RESULT} element={<Result />} />
          </Routes>
        </Box>
      </Box>
    </BrowserRouter>
  );
}

export default App
