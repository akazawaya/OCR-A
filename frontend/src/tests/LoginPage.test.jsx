// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { describe, expect, test } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import LoginPage from "../pages/LoginPage";

import { getCreatedUsers } from "./msw/authApiHandlers";
import { defaultMockAuthUser } from "./msw/fixture";

const LOGIN_PATH = "/login";
const DOCUMENTS_PATH = "/documents";

const LocationProbe = () => {
  const location = useLocation();

  return <div data-testid="location-display">{location.pathname}</div>;
};

const renderLoginPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[LOGIN_PATH]}>
        <Routes>
          <Route
            element={
              <>
                <LoginPage />
                <Toaster />
                <LocationProbe />
              </>
            }
            path={LOGIN_PATH}
          />
          <Route element={<LocationProbe />} path={DOCUMENTS_PATH} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("LoginPage", () => {
  test("ゲストユーザーでログインをクリックするとuserが追加される", async () => {
    renderLoginPage();

    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "ゲストユーザーでログイン" }),
    );

    await waitFor(() => {
      expect(getCreatedUsers()).toHaveLength(1);
    });
    expect(getCreatedUsers()[0].username).toMatch(/^guest_/);
    expect(await screen.findByTestId("location-display")).toHaveTextContent(
      DOCUMENTS_PATH,
    );
  });

  test("ログイン成功時はDocumentsPageへ遷移する", async () => {
    renderLoginPage();

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("ユーザー名"),
      defaultMockAuthUser.username,
    );
    await user.type(
      screen.getByLabelText("パスワード"),
      defaultMockAuthUser.password,
    );
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    expect(await screen.findByTestId("location-display")).toHaveTextContent(
      DOCUMENTS_PATH,
    );
  });

  test("ログイン失敗時は遷移せず失敗メッセージを表示する", async () => {
    renderLoginPage();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("ユーザー名"), "unknown");
    await user.type(screen.getByLabelText("パスワード"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    expect(await screen.findByText("ログインに失敗しました")).toBeVisible();
    expect(screen.getByTestId("location-display")).toHaveTextContent(
      LOGIN_PATH,
    );
  });
});
