// @vitest-environment jsdom

import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";

import OcrViewerPage from "./OcrViewerPage";

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = MockResizeObserver;

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

describe("OcrViewerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

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
        return Promise.resolve([
          {
            id: 1,
            page_number: 1,
            image: "/test.png",
            width_px: 1000,
            height_px: 800,
          },
        ]);
      }
      if (collectionUrl === "/words/") {
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    });
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
});
