// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi, afterEach } from "vitest";
import { screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import { sortMockWords } from "./msw/fixture";
import {
  renderViewerPage,
  setupDefaultViewerMocks,
  setupResizeObserverMock,
} from "./ViewerPage.test-utils";
import { setupCanvasTextMeasureMock } from "./mockCanvasTextMeasure";

const { mockGetCollection } = vi.hoisted(() => ({
  mockGetCollection: vi.fn(),
}));

const sortMockPage = {
  id: 101,
  page_number: 1,
  image: "/sort-page-1.png",
  width_px: 1000,
  height_px: 800,
};

vi.mock("../api/clients/collectionClient", () => ({
  getCollection: mockGetCollection,
}));

setupResizeObserverMock();

Object.defineProperty(HTMLElement.prototype, "clientWidth", {
  configurable: true,
  get() {
    return sortMockPage.width_px;
  },
});

Object.defineProperty(HTMLElement.prototype, "clientHeight", {
  configurable: true,
  get() {
    return sortMockPage.height_px;
  },
});

let getContextSpy;

beforeEach(() => {
  vi.clearAllMocks();
  getContextSpy = setupCanvasTextMeasureMock();
});

afterEach(() => {
  getContextSpy?.mockRestore();
});

describe("ViewerPage sort", () => {
  const sortCases = [
    {
      key: "horizontalVsVertical",
      expected: ["h1", "v1"],
    },
    {
      key: "horizontalTopBottom",
      expected: ["top", "bottom"],
    },
    {
      key: "horizontalLeftRight",
      expected: ["left", "right"],
    },
    {
      key: "verticalRightLeft",
      expected: ["vRight", "vLeft"],
    },
  ];

  test("sortMockWordsの比較規則どおりにViewerTableの並びが決まる", async () => {
    for (const { key, expected } of sortCases) {
      setupDefaultViewerMocks({
        mockGetCollection,
        pages: [sortMockPage],
        words: sortMockWords[key],
      });

      const { unmount } = renderViewerPage();

      await screen.findByRole("cell", { name: expected[0] });
      const orderedContents = screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => within(row).getAllByRole("cell")[1].textContent);

      expect(orderedContents).toEqual(expected);
      unmount();
    }
  });
});
