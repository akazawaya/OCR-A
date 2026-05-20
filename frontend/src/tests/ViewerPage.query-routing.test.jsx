// @vitest-environment jsdom

import { beforeEach, describe, expect, test } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";

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

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            element={<ViewerPage />}
            path="/documents/:primaryKey/viewer"
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("ViewerPage routing query", () => {
  test("routingQuery: 遷移先のprimaryKeyにより表示データの絞り込みが発生する", async () => {
    renderViewerPage("/documents/1/viewer");

    // 絞り込みの確認は ViewerTableの<tr>を想定する
    const table = screen.getByRole("table");
    expect(
      await within(table).findByRole("row", { name: /alpha word/i }),
    ).toBeVisible();

    expect(within(table).queryByRole("row", { name: /beta word/i })).toBeNull();
  });
});
