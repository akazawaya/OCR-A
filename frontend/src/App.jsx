import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Box } from "@mui/material";
import Sidebar from './components/Sidebar/Sidebar';
import DocumentsPage from './pages/DocumentsPage';
import DocumentPagesPage from './pages/DocumentPagesPage';
import DocumentPageWordsPage from './pages/DocumentPageWordsPage';
import OcrViewerPage from './pages/OcrViewerPage';


function App() {
  return (
    <BrowserRouter>
      <Box 
        className="app-root"
      >
      {/*
      <Box className="app-sidebar">
      <Sidebar/>
      </Box>
      */}
      <Box component="main" className="app-main">
          <Routes>
            <Route path="/" element={<DocumentsPage />} />    
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="documents/:primaryKey" element={<DocumentPagesPage />} />
            <Route path="documents/:primaryKey/viewer" element={<OcrViewerPage />} />
            <Route path="documents/:foreignKey/pages/:primaryKey" element={<DocumentPageWordsPage />} />
          </Routes>
      </Box>
    </Box>
    </BrowserRouter>
  );
}

export default App
