// @vitest-environment jsdom

import { beforeEach, afterEach, describe, test, expect, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";

import OcrViewerPage from "./OcrViewerPage";

function renderOcrViewerPage() {
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
}

const {
  mockUsePrint,
  mockUseRouting,
  mockGetCollection,
  mockPostCollectionItem,
  mockDeleteCollectionItem,
  mockPatchCollectionItem,
} = vi.hoisted(() => ({
  mockUsePrint: vi.fn(),
  mockUseRouting: vi.fn(),
  mockGetCollection: vi.fn(),
  mockPostCollectionItem: vi.fn(),
  mockDeleteCollectionItem: vi.fn(),
  mockPatchCollectionItem: vi.fn(),
}));

HTMLElement.prototype.scrollIntoView = vi.fn();

vi.mock("../appConfig", () => ({
  pageAccessSpec: {
    collectionUrl: "/pages/",
  },
  wordSpec: {
    collectionUrl: "/words/",
    ui: {
      table: [],
    },
  },
}));

vi.mock("../logic/print/usePrint", () => ({
  usePrint: mockUsePrint,
}));

vi.mock("../logic/routing/useRouting", () => ({
  useRouting: mockUseRouting,
}));

vi.mock("../api/clients/collectionClient", () => ({
  getCollection: mockGetCollection,
}));

vi.mock("../api/clients/mutationClient", () => ({
  postCollectionItem: mockPostCollectionItem,
  deleteCollectionItem: mockDeleteCollectionItem,
  patchCollectionItem: mockPatchCollectionItem,
}));

const mockPages = [
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
const mockWords = [];

mockGetCollection.mockImplementation(({ collectionUrl }) => {
  if (collectionUrl === "/pages/") {
    return Promise.resolve(mockPages);
  }
  if (collectionUrl === "/words/") {
    return Promise.resolve(mockWords);
  }
  return Promise.resolve([]);
});

afterEach(() => {
  cleanup();
});

describe("OcrViewerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get() {
        return mockPages[0].width_px;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get() {
        return mockPages[0].height_px;
      },
    });

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
    globalThis.ResizeObserver = MockResizeObserver;

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
  });

  test("ViewerTopBarのonClickPageStepButtonで対象ページへscrollIntoViewされる", async () => {
    renderOcrViewerPage();
    const nextButton = await screen.findByRole("button", { name: "次" });
    let page2;
    await waitFor(() => {
      page2 = document.querySelector('[data-page="2"]');
      expect(page2).not.toBeNull();
    });
    const mockScrollIntoView = vi.fn();
    page2.scrollIntoView = mockScrollIntoView;
    const user = userEvent.setup();
    await user.click(nextButton);
    expect(mockScrollIntoView).toHaveBeenCalled();
  });

  test("ViewerTopBarのonClickZoomStepButtonでViewerImageのサイズが更新される", async () => {
    renderOcrViewerPage();
    const zoomUpButton = await screen.findByRole("button", { name: "拡大" });
    const zoomDownButton = await screen.findByRole("button", { name: "縮小" });
    const imageTransform = await screen.findByTestId(
      "viewer-image-transform-1",
    );
    expect(mockGetCollection).toHaveBeenCalled();
    expect(imageTransform.style.width).toBe("1000px");
    expect(imageTransform.style.height).toBe("800px");
    const user = userEvent.setup();
    await user.click(zoomUpButton);
    expect(imageTransform.style.width).toBe("1250px");
    expect(imageTransform.style.height).toBe("1000px");
    await user.click(zoomDownButton);
    expect(imageTransform.style.width).toBe("1000px");
    expect(imageTransform.style.height).toBe("800px");
  });

  test("ViewerTopBarのonClickRotateStepButtonでViewerImageの--rotateが更新される", async () => {
    renderOcrViewerPage();
    const rotateButton = await screen.findByRole("button", { name: "回転" });
    const imageTransform = await screen.findByTestId(
      "viewer-image-transform-1",
    );
    expect(imageTransform.style.getPropertyValue("--rotate")).toBe("0deg");
    const user = userEvent.setup();
    await user.click(rotateButton);
    expect(imageTransform.style.getPropertyValue("--rotate")).toBe("90deg");
  });

  test("ViewerTopBarのonEnterPageInputで対象ページへscrollIntoViewされる", async () => {
    renderOcrViewerPage();
    let page2;
    await waitFor(() => {
      page2 = document.querySelector('[data-page="2"]');
      expect(page2).not.toBeNull();
    });
    const mockScrollIntoView = vi.fn();
    page2.scrollIntoView = mockScrollIntoView;
    const pageInput = await screen.findByRole("textbox", { name: "page" });
    const user = userEvent.setup();
    await user.clear(pageInput);
    await user.type(pageInput, "2{Enter}");
    expect(mockScrollIntoView).toHaveBeenCalled();
  });

  test("ViewerTopBarのonEnterZoomInputでViewerImageのサイズが更新される", async () => {
    renderOcrViewerPage();
    const imageTransform = await screen.findByTestId(
      "viewer-image-transform-1",
    );
    expect(imageTransform.style.width).toBe("1000px");
    expect(imageTransform.style.height).toBe("800px");
    const zoomInput = await screen.findByRole("textbox", { name: "zoom" });
    const user = userEvent.setup();
    await user.clear(zoomInput);
    await user.type(zoomInput, "125{Enter}");
    expect(imageTransform.style.width).toBe("1250px");
    expect(imageTransform.style.height).toBe("1000px");
  });

  test("ViewerTopBarのonEnterRotateInputでViewerImageの--rotateが更新される", async () => {
    renderOcrViewerPage();
    const imageTransform = await screen.findByTestId(
      "viewer-image-transform-1",
    );
    expect(imageTransform.style.getPropertyValue("--rotate")).toBe("0deg");
    const rotateInput = await screen.findByRole("textbox", { name: "rotate" });
    const user = userEvent.setup();
    await user.clear(rotateInput);
    await user.type(rotateInput, "90{Enter}");
    expect(imageTransform.style.getPropertyValue("--rotate")).toBe("90deg");
  });
});
