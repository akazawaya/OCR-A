import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Box } from "@mui/material";
import Sidebar from './components/Sidebar/Sidebar';
import DocumentsPage from './pages/DocumentsPage';
import DocumentPagesPage from './pages/DocumentPagesPage';
import DocumentPageWordsPage from './pages/DocumentPageWordsPage';

const drawerWidth = 240;
function App() {
  return (
    <BrowserRouter>
      <Box sx={{ display: "flex" }}>
        <Sidebar/>
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <Routes>
            <Route path="/" element={<DocumentsPage />} />    
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="documents/:docId" element={<DocumentPagesPage />} />
            <Route path="documents/:docId/pages/:pageNo" element={<DocumentPageWordsPage />} />
          </Routes>
        </Box>
      </Box>
    </BrowserRouter>
  );
}

export default App
