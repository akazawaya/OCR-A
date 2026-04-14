import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

import ViewerPage from "../pages/ViewerPage";
// pageAccessSpec/wordSpec は、setupでVITE_API_BASE_URLをstub済みの想定。
// ※実際の通信関数はmockすること！
import { pageAccessSpec, wordSpec } from "../appConfig";

export const defaultMockPages = [
  {
    id: 1,
    page_number: 1,
    image: "/test_1.png",
    width_px: 1000,
    height_px: 800,
  },
  {
    id: 2,
    page_number: 2,
    image: "/test_2.png",
    width_px: 1000,
    height_px: 800,
  },
];

export const defaultMockWords = [
  {
    id: 1,
    page: 1,
    page__page_number: 1,
    bbox: [
      [100, 100],
      [200, 100],
      [200, 150],
      [100, 150],
    ],
    content: "テスト語",
    direction: 1,
  },
];

export const renderViewerPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ViewerPage />
    </QueryClientProvider>,
  );
};

export const setupDefaultViewerMocks = ({
  mockUseRouting,
  mockUsePrint,
  mockGetCollection,
  pages = defaultMockPages,
  words = defaultMockWords,
} = {}) => {
  mockUseRouting.mockReturnValue({
    search: "",
    primaryKey: "1",
    columnsSort: vi.fn(),
  });

  mockUsePrint.mockReturnValue({
    printRef: { current: null },
    isPrintMode: false,
    openPrintDialog: vi.fn(),
  });

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
