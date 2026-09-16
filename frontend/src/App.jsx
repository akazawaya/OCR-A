import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DocumentsPage from "./pages/DocumentsPage";
import ViewerPage from "./pages/ViewerPage";
import SettingPage from "./pages/SettingPage";
import { routePaths } from "./appConfig";
import AuthLayout from "./components/Auth/AuthLayout";

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: <LoginPage />,
  },
  {
    path: routePaths.login.template,
    element: <LoginPage />,
  },
  {
    path: routePaths.signup.template,
    element: <SignupPage />,
  },
  {
    element: <AuthLayout />,
    children: [
      {
        path: routePaths.docs.template,
        element: <DocumentsPage />,
      },
      {
        path: routePaths.viewer.template,
        element: <ViewerPage />,
      },
      {
        path: routePaths.setting.template,
        element: <SettingPage />,
      },
    ],
  },
]);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-dvh overflow-hidden">
        <RouterProvider router={router} />
      </div>
      <Toaster />

      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default App;
