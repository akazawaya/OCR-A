// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import "@testing-library/jest-dom/vitest";

import ViewerPage from "../pages/ViewerPage";
import { pageAccessSpec, wordAccessSpec } from "../appConfig";

import { queryRoutingMockPages, queryRoutingMockWords } from "./msw/fixture";
import { setupCanvasTextMeasureMock } from "./mockCanvasTextMeasure";

const { mockGetCollection } = vi.hoisted(() => ({
  mockGetCollection: vi.fn(),
}));

class MockResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }

  observe() {
    this.callback([]);
  }

  unobserve() {}

  disconnect() {}
}

vi.mock("../api/clients/collectionClient", () => ({
  getCollection: mockGetCollection,
}));

Object.defineProperty(HTMLElement.prototype, "clientWidth", {
  configurable: true,
  get() {
    return 1000;
  },
});

Object.defineProperty(HTMLElement.prototype, "clientHeight", {
  configurable: true,
  get() {
    return 800;
  },
});

let getContextSpy;
beforeEach(() => {
  getContextSpy = setupCanvasTextMeasureMock();
  globalThis.ResizeObserver = MockResizeObserver;
  mockGetCollection.mockImplementation(({ collectionUrl, queryString }) => {
    const params = new URLSearchParams(queryString || "");

    if (collectionUrl === pageAccessSpec.collectionUrl) {
      const doc = params.get("doc");
      return Promise.resolve(
        queryRoutingMockPages.filter((page) => page.doc === doc),
      );
    }

    if (collectionUrl === wordAccessSpec.collectionUrl) {
      const doc = params.get("page__doc");
      const keyword = (params.get("keyword") || "").toLowerCase();
      return Promise.resolve(
        queryRoutingMockWords.filter((word) => {
          const sameDoc = word.page__doc === doc;
          const matchesKeyword =
            !keyword || word.content.toLowerCase().includes(keyword);

          return sameDoc && matchesKeyword;
        }),
      );
    }

    return Promise.resolve([]);
  });
});

afterEach(() => {
  getContextSpy?.mockRestore();
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
  test("routingQuery: 遷移先のprimaryKeyにより対象documentだけに絞り込まれる", async () => {
    renderViewerPage(
      "/documents/1/viewer?keyword=alpha&field_name=both&lookup_expr=icontains&keyword_operator=or",
    );

    expect(
      await screen.findByTestId("viewer-image-transform-101"),
    ).toBeVisible();
    expect(screen.queryByTestId("viewer-image-transform-201")).toBeNull();
    expect(
      await screen.findByRole("button", { name: "alpha word" }),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "beta word" })).toBeNull();

    expect(mockGetCollection).toHaveBeenCalledWith({
      collectionUrl: pageAccessSpec.collectionUrl,
      queryString: "?doc=1",
    });
    expect(mockGetCollection).toHaveBeenCalledWith({
      collectionUrl: wordAccessSpec.collectionUrl,
      queryString: "?page__doc=1",
    });
  });
});
