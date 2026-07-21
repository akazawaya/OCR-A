// @vitest-environment jsdom

import { beforeEach, describe, expect, test } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import "@testing-library/jest-dom/vitest";
import ViewerPage from "../pages/ViewerPage";

import { setMockPages } from "./msw/pagesApiHandlers";
import { setMockWords } from "./msw/wordsApiHandlers";
import { queryRoutingMockPages, queryRoutingMockWords } from "./msw/fixture";
import { setupDefaultViewerMocks } from "./ViewerPage.test-utils";

beforeEach(() => {
  setupDefaultViewerMocks();
  setMockPages(queryRoutingMockPages);
  setMockWords(queryRoutingMockWords);
});

const renderViewerPage = (initialEntry) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const router = createMemoryRouter(
    [
      {
        path: "/documents/:primaryKey/viewer",
        element: <ViewerPage />,
      },
    ],
    { initialEntries: [initialEntry] },
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

describe("ViewerPage routing query", () => {
  test("routingQuery: 遷移先のprimaryKeyにより表示データの絞り込みが発生する", async () => {
    renderViewerPage("/documents/1/viewer");

    // 絞り込みの確認は ViewerTableの<tr>を想定する
    const table = await screen.findByRole("table");
    expect(
      await within(table).findByRole("row", { name: /alpha word/i }),
    ).toBeVisible();

    expect(within(table).queryByRole("row", { name: /beta word/i })).toBeNull();
  });
});
