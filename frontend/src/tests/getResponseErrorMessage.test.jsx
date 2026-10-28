// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { expect, test } from "vitest";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import SignupPage from "../pages/SignupPage";

import { setMockSignupPasswordErrorData } from "./msw/authApiHandlers";
import { defaultMockAuthUser } from "./msw/fixture";

test("APIレスポンスのエラー内容を表示し、内容がない場合は用意されたメッセージを表示する（代表してSignupのパスワード長）", async () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SignupPage />
        <Toaster />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  const user = userEvent.setup();
  await user.type(
    screen.getByLabelText("メールアドレス"),
    defaultMockAuthUser.email,
  );
  await user.type(screen.getByLabelText("パスワード"), "short");
  await user.type(screen.getByLabelText("パスワード確認"), "short");
  await user.click(screen.getByRole("button", { name: "アカウント作成" }));

  expect(
    await screen.findByText(
      "このパスワードは短すぎます。最低 8 文字以上必要です。",
    ),
  ).toBeVisible();

  setMockSignupPasswordErrorData({});
  await user.click(screen.getByRole("button", { name: "アカウント作成" }));

  expect(await screen.findByText("アカウント作成に失敗しました")).toBeVisible();
});
