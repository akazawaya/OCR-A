// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { describe, expect, test } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";

import {
  getCreatedUsers,
  getReceivedCreateUserRequestBody,
} from "./msw/authApiHandlers";
import { defaultMockAuthUser } from "./msw/fixture";

const SIGNUP_PATH = "/signup";
const LOGIN_PATH = "/login";
const DOCUMENTS_PATH = "/documents";

const LocationProbe = () => {
  const location = useLocation();

  return <div data-testid="location-display">{location.pathname}</div>;
};

const renderSignupPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[SIGNUP_PATH]}>
        <Routes>
          <Route
            element={
              <>
                <SignupPage />
                <Toaster />
                <LocationProbe />
              </>
            }
            path={SIGNUP_PATH}
          />
          <Route element={<LocationProbe />} path={DOCUMENTS_PATH} />
          <Route
            element={
              <>
                <LoginPage />
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

describe("SignupPage", () => {
  test("アカウント作成に成功するとuserが追加され、DocumentsPageへ遷移する", async () => {
    renderSignupPage();

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("ユーザー名"),
      defaultMockAuthUser.username,
    );
    await user.type(
      screen.getByLabelText("パスワード"),
      defaultMockAuthUser.password,
    );
    await user.type(
      screen.getByLabelText("パスワード確認"),
      defaultMockAuthUser.password,
    );
    await user.click(screen.getByRole("button", { name: "アカウント作成" }));

    await waitFor(() => {
      expect(getCreatedUsers()).toHaveLength(1);
    });
    expect(getReceivedCreateUserRequestBody()).toEqual({
      type: "registered",
      username: defaultMockAuthUser.username,
      password: defaultMockAuthUser.password,
    });
    expect(await screen.findByTestId("location-display")).toHaveTextContent(
      DOCUMENTS_PATH,
    );
  });

  test("パスワード確認が一致しない場合はuserを追加しない", async () => {
    renderSignupPage();

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("ユーザー名"),
      defaultMockAuthUser.username,
    );
    await user.type(
      screen.getByLabelText("パスワード"),
      defaultMockAuthUser.password,
    );
    await user.type(screen.getByLabelText("パスワード確認"), "different-pass");
    await user.click(screen.getByRole("button", { name: "アカウント作成" }));

    expect(await screen.findByText("パスワードが一致しません")).toBeVisible();
    expect(getCreatedUsers()).toHaveLength(0);
    expect(getReceivedCreateUserRequestBody()).toBeNull();
    expect(screen.getByTestId("location-display")).toHaveTextContent(
      SIGNUP_PATH,
    );
  });
});
