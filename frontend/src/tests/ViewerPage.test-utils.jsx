import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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

export const queryRoutingMockPages = [
  {
    id: 101,
    page_number: 1,
    image: "/doc1-page1.png",
    width_px: 1000,
    height_px: 800,
    doc: "1",
  },
  {
    id: 201,
    page_number: 1,
    image: "/doc2-page1.png",
    width_px: 1000,
    height_px: 800,
    doc: "2",
  },
];

export const queryRoutingMockWords = [
  {
    id: 1,
    page: 101,
    page__page_number: 1,
    page__doc: "1",
    bbox: [
      [100, 100],
      [200, 100],
      [200, 150],
      [100, 150],
    ],
    content: "alpha word",
    direction: 1,
  },
  {
    id: 2,
    page: 201,
    page__page_number: 1,
    page__doc: "2",
    bbox: [
      [100, 100],
      [200, 100],
      [200, 150],
      [100, 150],
    ],
    content: "beta word",
    direction: 1,
  },
];

// idに関わらずsortの順番が機能することを確認するためのwordMock
// horizontalVsVerticalでh1が優先
// horizontalTopBottomでtopが優先
// horizontalLeftRightでleftが優先
// verticalRightLeftでvRightが優先
export const sortMockWords = {
  horizontalVsVertical: [
    {
      id: "z-h1",
      page: 101,
      page__page_number: 1,
      page__doc: "1",
      bbox: [
        [100, 100],
        [160, 100],
        [160, 130],
        [100, 130],
      ],
      content: "h1",
      direction: 1,
    },
    {
      id: "a-v1",
      page: 101,
      page__page_number: 1,
      page__doc: "1",
      bbox: [
        [80, 80],
        [110, 80],
        [110, 180],
        [80, 180],
      ],
      content: "v1",
      direction: 2,
    },
  ],

  horizontalTopBottom: [
    {
      id: "z-top",
      page: 101,
      page__page_number: 1,
      page__doc: "1",
      bbox: [
        [100, 100],
        [160, 100],
        [160, 130],
        [100, 130],
      ],
      content: "top",
      direction: 1,
    },
    {
      id: "a-bottom",
      page: 101,
      page__page_number: 1,
      page__doc: "1",
      bbox: [
        [100, 200],
        [160, 200],
        [160, 230],
        [100, 230],
      ],
      content: "bottom",
      direction: 1,
    },
  ],

  horizontalLeftRight: [
    {
      id: "z-left",
      page: 101,
      page__page_number: 1,
      page__doc: "1",
      bbox: [
        [100, 100],
        [160, 100],
        [160, 130],
        [100, 130],
      ],
      content: "left",
      direction: 1,
    },
    {
      id: "a-right",
      page: 101,
      page__page_number: 1,
      page__doc: "1",
      bbox: [
        [200, 100],
        [260, 100],
        [260, 130],
        [200, 130],
      ],
      content: "right",
      direction: 1,
    },
  ],

  verticalRightLeft: [
    {
      id: "z-vRight",
      page: 101,
      page__page_number: 1,
      page__doc: "1",
      bbox: [
        [200, 100],
        [230, 100],
        [230, 220],
        [200, 220],
      ],
      content: "vRight",
      direction: 2,
    },
    {
      id: "a-vLeft",
      page: 101,
      page__page_number: 1,
      page__doc: "1",
      bbox: [
        [100, 100],
        [130, 100],
        [130, 220],
        [100, 220],
      ],
      content: "vLeft",
      direction: 2,
    },
  ],
};

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
