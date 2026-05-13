import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";

import ViewerPage from "../pages/ViewerPage";
// pageAccessSpec/wordSpec は、setupでVITE_API_BASE_URLをstub済みの想定。
// ※実際の通信関数はmockすること！
import { pageAccessSpec, wordSpec } from "../appConfig";

import { defaultMockPages, defaultMockWords } from "./msw/fixture";

export const renderViewerPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/documents/1/viewer"]}>
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

export const setupDefaultViewerMocks = ({
  mockUsePrint,
  mockGetCollection,
  mockOpenPrintDialog = vi.fn(),
  pages = defaultMockPages,
  words = defaultMockWords,
} = {}) => {
  if (mockUsePrint) {
    mockUsePrint.mockReturnValue({
      contentRef: { current: null },
      isPrintMode: false,
      openPrintDialog: mockOpenPrintDialog,
    });
  }

  mockGetCollection.mockImplementation(({ collectionUrl }) => {
    if (collectionUrl === pageAccessSpec.collectionUrl) {
      return Promise.resolve(structuredClone(pages));
    }
    if (collectionUrl === wordSpec.collectionUrl) {
      return Promise.resolve(structuredClone(words));
    }
    return Promise.resolve([]);
  });
};

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

export const setupResizeObserverMock = () => {
  globalThis.ResizeObserver = MockResizeObserver;
};
