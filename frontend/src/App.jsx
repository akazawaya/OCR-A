import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import DocumentsPage from "./pages/DocumentsPage";
import ViewerPage from "./pages/ViewerPage";
import { routePaths } from "./appConfig";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="h-dvh overflow-hidden">
          <Routes>
            <Route element={<DocumentsPage />} path="/" />
            <Route
              element={<DocumentsPage />}
              path={routePaths.docs.template}
            />
            <Route element={<ViewerPage />} path={routePaths.viewer.template} />
          </Routes>
        </div>
      </BrowserRouter>

      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default App;
