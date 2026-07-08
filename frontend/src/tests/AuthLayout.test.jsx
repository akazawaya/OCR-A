// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, test } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import AuthLayout from "../components/Auth/AuthLayout";

import { loginMockUser } from "./msw/authApiHandlers";

const LOGIN_PATH = "/login";
const DOCUMENTS_PATH = "/documents";

const LocationProbe = () => {
  const location = useLocation();

  return <div data-testid="location-display">{location.pathname}</div>;
};

const renderProtectedDocumentsRoute = ({
  initialEntry = DOCUMENTS_PATH,
} = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route
              element={
                <>
                  <div>DocumentsPage</div>
                  <LocationProbe />
                </>
              }
              path={DOCUMENTS_PATH}
            />
          </Route>
          <Route
            element={
              <>
                <div>LoginPage</div>
                <LocationProbe />
              </>
            }
            path={LOGIN_PATH}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("AuthLayout", () => {
  test("認証時は保護対象ページ(代表でDocumentsPage)を表示する", async () => {
    loginMockUser();

    renderProtectedDocumentsRoute();

    expect(await screen.findByTestId("location-display")).toHaveTextContent(
      DOCUMENTS_PATH,
    );
  });

  test("未認証時はDocumentPageからLoginPageへリダイレクトする", async () => {
    renderProtectedDocumentsRoute();
    expect(await screen.findByTestId("location-display")).toHaveTextContent(
      LOGIN_PATH,
    );
  });
});
