// @vitest-environment jsdom

import { beforeEach, describe, expect, test } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryRouter,
  RouterProvider,
  useLocation,
} from "react-router-dom";
import "@testing-library/jest-dom/vitest";

import AuthLayout from "../components/Auth/AuthLayout";
import ViewerPage from "../pages/ViewerPage";

import { loginMockUser } from "./msw/authApiHandlers";
import {
  setupCanvasTextMeasureMock,
  setupDefaultViewerMocks,
} from "./ViewerPage.test-utils";

const DOCUMENTS_PATH = "/documents";
const LOGIN_PATH = "/login";
const VIEWER_PATH = "/documents/1/viewer";

const LocationProbe = () => {
  const location = useLocation();

  return <div data-testid="location-display">{location.pathname}</div>;
};

const renderViewerWithAuthLayout = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const router = createMemoryRouter(
    [
      {
        element: <AuthLayout />,
        children: [
          {
            path: "/documents/:primaryKey/viewer",
            element: (
              <>
                <ViewerPage />
                <LocationProbe />
              </>
            ),
          },
          {
            path: DOCUMENTS_PATH,
            element: <LocationProbe />,
          },
        ],
      },
      {
        path: LOGIN_PATH,
        element: <LocationProbe />,
      },
    ],
    { initialEntries: [VIEWER_PATH] },
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  loginMockUser();
  setupDefaultViewerMocks();
  setupCanvasTextMeasureMock();
});

describe("ViewerPage navigation guard", () => {
  test("編集中にトップページを選択すると確認後に遷移する", async () => {
    // useBlockerの遷移ガードは「トップページ」を代表としてテストする
    renderViewerWithAuthLayout();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "編集" }));
    await user.click(
      screen.getByRole("button", { name: "ユーザーメニュー開閉ボタン" }),
    );
    await user.click(screen.getByRole("button", { name: "トップページ" }));
    expect(screen.getByTestId("location-display")).toHaveTextContent(
      VIEWER_PATH,
    );
    const dialog = screen.getByRole("alertdialog", {
      name: "このページを離れますか？",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "保存せずページを離れる" }),
    );

    expect(screen.getByTestId("location-display")).toHaveTextContent(
      DOCUMENTS_PATH,
    );
  });

  test("編集中は確認後にログアウトAPIを実行する", async () => {
    renderViewerWithAuthLayout();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "編集" }));
    await user.click(
      screen.getByRole("button", { name: "ユーザーメニュー開閉ボタン" }),
    );
    await user.click(screen.getByRole("button", { name: "ログアウト" }));

    expect(screen.getByTestId("location-display")).toHaveTextContent(
      VIEWER_PATH,
    );
    // alertdialogの表示中は、確認前のためログアウトAPIは未実行とみなす
    const dialog = screen.getByRole("alertdialog", {
      name: "このページを離れますか？",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "保存せずページを離れる" }),
    );
    // ログアウト成功後に認証情報が再取得され、未認証と判定されることで
    // LoginPageへ遷移するため、この遷移をもって成功を確認する。
    expect(await screen.findByTestId("location-display")).toHaveTextContent(
      LOGIN_PATH,
    );
  });

  test("編集中はブラウザを閉じる操作をガードする", async () => {
    // useBeforeUnloadの遷移ガードは「ブラウザの離脱」を代表としてテストする
    renderViewerWithAuthLayout();
    const user = userEvent.setup();

    const beforeEditEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(beforeEditEvent);
    expect(beforeEditEvent.defaultPrevented).toBe(false);

    await user.click(await screen.findByRole("button", { name: "編集" }));

    const editingEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(editingEvent);
    expect(editingEvent.defaultPrevented).toBe(true);
  });
});
