import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Box } from "@mui/material";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import DocumentsPage from "./pages/DocumentsPage";
import OcrViewerPage from "./pages/OcrViewerPage";
import { routePaths } from "./appConfig";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
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

      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
