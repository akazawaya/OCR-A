// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { describe, expect, test } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import SettingPage from "../pages/SettingPage";

import { getReceivedPasswordChangeRequestBody } from "./msw/authApiHandlers";
import { defaultMockAuthUser } from "./msw/fixture";

const SETTING_PATH = "/setting";
const LOGIN_PATH = "/login";

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
                <Toaster />
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
  test("新しいパスワードと確認用パスワードが一致すると、パスワード変更リクエストを送信する", async () => {
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
  });

  test("新しいパスワードと確認用パスワードが一致しない場合は変更リクエストを送信せず、エラーを表示する", async () => {
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
      "different-pass",
    );

    await user.click(screen.getByRole("button", { name: "変更" }));

    expect(
      await screen.findByText("新しいパスワードが一致しません"),
    ).toBeVisible();
    expect(getReceivedPasswordChangeRequestBody()).toBeNull();
  });

  test("警告の承認を経てアカウント削除を確定すると、削除成功後にLoginPageへ遷移する", async () => {
    renderSettingPage();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "アカウントを削除" }));

    const dialog = screen.getByRole("alertdialog", {
      name: "本当に削除してよろしいですか？",
    });
    await user.click(within(dialog).getByRole("button", { name: "削除" }));
    // LoginPageへの遷移は削除リクエスト成功時のonSuccessでのみ発生するため、
    // 遷移をもって削除リクエストの成功経路を確認する
    await waitFor(() => {
      expect(screen.getByTestId("location-display")).toHaveTextContent(
        LOGIN_PATH,
      );
    });
  });
});
