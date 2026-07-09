// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { describe, expect, test } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import AuthLayout from "../components/Auth/AuthLayout";

import { loginMockUser } from "./msw/authApiHandlers";
import { MOCK_API_BASE_URL } from "./msw/config";
import { defaultMockAuthUser } from "./msw/fixture";

const LOGIN_PATH = "/login";
const DOCUMENTS_PATH = "/documents";
const VIEWER_PATH = "/documents/1/viewer";

const LocationProbe = () => {
  const location = useLocation();

  return <div data-testid="location-display">{location.pathname}</div>;
};

const renderAuthLayout = ({ initialEntry = DOCUMENTS_PATH } = {}) => {
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
            <Route
              element={
                <>
                  <div>ViewerPage</div>
                  <LocationProbe />
                </>
              }
              path="/documents/:primaryKey/viewer"
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

    renderAuthLayout();

    expect(await screen.findByTestId("location-display")).toHaveTextContent(
      DOCUMENTS_PATH,
    );
  });

  test("未認証時はDocumentPageからLoginPageへリダイレクトする", async () => {
    renderAuthLayout();
    expect(await screen.findByTestId("location-display")).toHaveTextContent(
      LOGIN_PATH,
    );
  });
});

describe("AppSidebar", () => {
  test("ユーザー名が反映され、表示される", async () => {
    loginMockUser();
    renderAuthLayout();

    expect(await screen.findByText(defaultMockAuthUser.username)).toBeVisible();
  });

  test("トップページボタンをクリックするとDocumentsPageへ遷移する", async () => {
    loginMockUser();
    renderAuthLayout({ initialEntry: VIEWER_PATH });
    const user = userEvent.setup();

    await screen.findByText(defaultMockAuthUser.username);
    await user.click(screen.getByRole("button", { name: "トップページ" }));

    expect(screen.getByTestId("location-display")).toHaveTextContent(
      DOCUMENTS_PATH,
    );
  });

  test("ログアウトボタンをクリックすると認証状態を破棄してLoginPageへ遷移する", async () => {
    loginMockUser();
    renderAuthLayout();
    const user = userEvent.setup();

    await screen.findByText(defaultMockAuthUser.username);
    await user.click(screen.getByRole("button", { name: "ログアウト" }));

    expect(await screen.findByText("LoginPage")).toBeVisible();
    expect(screen.getByTestId("location-display")).toHaveTextContent(
      LOGIN_PATH,
    );

    const meResponse = await fetch(`${MOCK_API_BASE_URL}/auth/me/`);
    await expect(meResponse.json()).resolves.toMatchObject({
      authenticated: false,
    });
  });
});
