import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Box } from "@mui/material";

import DocumentsPage from "./pages/DocumentsPage";
import OcrViewerPage from "./pages/OcrViewerPage";
import { routePaths } from "./appConfig";

function App() {
  return (
    <BrowserRouter>
      <Box className="app-root">
        <Box className="app-sidebar"></Box>
        <Box component="main" className="app-main">
          <Routes>
            {/* ルート( / )でも documents 一覧を表示する */}
            <Route path="/" element={<DocumentsPage />} />
            <Route
              path={routePaths.docs.template}
              element={<DocumentsPage />}
            />
            <Route
              path={routePaths.viewer.template}
              element={<OcrViewerPage />}
            />
          </Routes>
        </Box>
      </Box>
    </BrowserRouter>
  );
}

export default App;
