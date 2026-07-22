// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { describe, expect, test } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import SettingPage from "../pages/SettingPage";

import { getReceivedPasswordChangeRequestBody } from "./msw/authApiHandlers";
import { MOCK_API_BASE_URL } from "./msw/config";
import { defaultMockAuthUser } from "./msw/fixture";

const SETTING_PATH = "/setting";
const LOGIN_PATH = "/login";

const login = (password) => {
  return fetch(`${MOCK_API_BASE_URL}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: defaultMockAuthUser.email,
      password,
    }),
  });
};

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
};

const renderSettingPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[SETTING_PATH]}>
        <Routes>
          <Route
            element={
              <>
                <SettingPage />
                <LocationProbe />
              </>
            }
            path={SETTING_PATH}
          />
          <Route element={<LocationProbe />} path={LOGIN_PATH} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("SettingPage", () => {
  test("現在のパスワードの認証により、パスワードの変更が可能", async () => {
    renderSettingPage();

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("現在のパスワード"),
      defaultMockAuthUser.password,
    );

    await user.type(
      screen.getByLabelText("新しいパスワード"),
      "newPassword1234",
    );

    await user.type(
      screen.getByLabelText("新しいパスワード（確認）"),
      "newPassword1234",
    );

    await user.click(screen.getByRole("button", { name: "変更" }));
    await waitFor(() => {
      expect(getReceivedPasswordChangeRequestBody()).toEqual({
        current_password: defaultMockAuthUser.password,
        new_password: "newPassword1234",
      });
    });

    const loginResponse = await login("newPassword1234");
    expect(loginResponse.status).toBe(200);
  });

  test("警告の承認を経て、アカウント削除が可能", async () => {
    renderSettingPage();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "アカウントを削除" }));

    const dialog = screen.getByRole("alertdialog", {
      name: "本当に削除してよろしいですか？",
    });
    await user.click(within(dialog).getByRole("button", { name: "削除" }));

    expect(await screen.findByTestId("location-display")).toHaveTextContent(
      LOGIN_PATH,
    );

    const loginResponse = await login(defaultMockAuthUser.password);
    expect(loginResponse.status).toBe(400);
  });
});
