import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";

import ViewerPage from "../pages/ViewerPage";

import { resetMockPages } from "./msw/pagesApiHandlers";
import { resetMockWords } from "./msw/wordsApiHandlers";
// pageAccessSpec/wordSpec は、setupでVITE_API_BASE_URLをstub済みの想定。
// ※実際の通信関数はmockすること！
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

export const setupCanvasTextMeasureMock = () => {
  return vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockImplementation(() => ({
      font: "",
      measureText: (text) => ({ width: String(text).length * 10 }),
    }));
};

export const setupDefaultViewerMocks = ({
  mockUsePrint,
  mockOpenPrintDialog = vi.fn(),
} = {}) => {
  resetMockPages();
  resetMockWords();
  if (mockUsePrint) {
    mockUsePrint.mockReturnValue({
      contentRef: { current: null },
      isPrintMode: false,
      openPrintDialog: mockOpenPrintDialog,
    });
  }
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
