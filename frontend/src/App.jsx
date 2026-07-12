import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DocumentsPage from "./pages/DocumentsPage";
import ViewerPage from "./pages/ViewerPage";
import { routePaths } from "./appConfig";
import AuthLayout from "./components/Auth/AuthLayout";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="h-dvh overflow-hidden">
          <Routes>
            <Route element={<LoginPage />} path="/" />
            <Route element={<LoginPage />} path={routePaths.login.template} />
            <Route element={<SignupPage />} path={routePaths.signup.template} />

            <Route element={<AuthLayout />}>
              <Route
                element={<DocumentsPage />}
                path={routePaths.docs.template}
              />
              <Route
                element={<ViewerPage />}
                path={routePaths.viewer.template}
              />
            </Route>
          </Routes>
        </div>
        <Toaster />
      </BrowserRouter>

      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default App;
