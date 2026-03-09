import { BrowserRouter, Route, Routes } from "react-router-dom";
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
        <Routes>
          <Route path="/" element={<DocumentsPage />} />
          <Route path={routePaths.docs.template} element={<DocumentsPage />} />
          <Route
            path={routePaths.viewer.template}
            element={<OcrViewerPage />}
          />
        </Routes>
      </BrowserRouter>

      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
