import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

import OcrViewerPage from "../pages/OcrViewerPage";

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

export const renderOcrViewerPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <OcrViewerPage />
    </QueryClientProvider>,
  );
};

export const setupDefaultOcrViewerMocks = ({
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
    if (collectionUrl === "/pages/") {
      return Promise.resolve(structuredClone(pages));
    }
    if (collectionUrl === "/words/") {
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
