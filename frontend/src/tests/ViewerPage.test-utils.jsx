import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
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

  const router = createMemoryRouter(
    [
      {
        path: "/documents/:primaryKey/viewer",
        element: <ViewerPage />,
      },
    ],
    { initialEntries: ["/documents/1/viewer"] },
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
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

const mockUsePrint = vi.hoisted(() => vi.fn());

vi.mock("../logic/print/usePrint", () => ({
  usePrint: mockUsePrint,
}));

export { mockUsePrint };
// vi.hoisted() のreturnは直接 export 不可のため分けてexportする（returnのcallテスト用）

export const setupDefaultViewerMocks = () => {
  resetMockPages();
  resetMockWords();
  globalThis.ResizeObserver = MockResizeObserver;
  mockUsePrint.mockReset();
  mockUsePrint.mockReturnValue({});
  Element.prototype.scrollIntoView = vi.fn();
};
