// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { describe, expect, test } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import AppSidebar from "../components/AppSidebar";

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

const renderAppSidebar = ({ initialEntry = VIEWER_PATH } = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <AppSidebar user={defaultMockAuthUser} />
        <Routes>
          <Route element={<LocationProbe />} path={LOGIN_PATH} />
          <Route element={<LocationProbe />} path={DOCUMENTS_PATH} />
          <Route element={<LocationProbe />} path={VIEWER_PATH} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("AppSidebar", () => {
  test("ユーザー名が反映され、表示される", async () => {
    renderAppSidebar();
    expect(screen.getByText(defaultMockAuthUser.username)).toBeVisible();
  });

  test("トップページボタンをクリックするとDocumentsPageへ遷移する", async () => {
    renderAppSidebar();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "トップページ" }));

    expect(screen.getByTestId("location-display")).toHaveTextContent(
      DOCUMENTS_PATH,
    );
  });

  test("ログアウトボタンをクリックすると認証状態を破棄してLoginPageへ遷移する", async () => {
    loginMockUser();
    renderAppSidebar();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "ログアウト" }));

    await waitFor(() =>
      expect(screen.getByTestId("location-display")).toHaveTextContent(
        LOGIN_PATH,
      ),
    );

    const meResponse = await fetch(`${MOCK_API_BASE_URL}/auth/me/`);
    await expect(meResponse.json()).resolves.toMatchObject({
      authenticated: false,
    });
  });
});
