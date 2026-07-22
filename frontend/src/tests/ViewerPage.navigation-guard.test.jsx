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
// useBlockerの遷移ガードは「トップページ」を代表としてテストする
describe("ViewerPage navigation guard", () => {
  test("編集中にトップページを選択すると確認後に遷移する", async () => {
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
      name: "編集を中止して移動しますか？",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "保存せず移動" }),
    );

    expect(screen.getByTestId("location-display")).toHaveTextContent(
      DOCUMENTS_PATH,
    );
  });
});
