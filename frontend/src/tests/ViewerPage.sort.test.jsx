// @vitest-environment jsdom

import { beforeEach, describe, expect, test } from "vitest";
import { screen, within } from "@testing-library/react";

import "@testing-library/jest-dom/vitest";
import { sortMockPages, sortMockWords } from "./msw/fixture";
import { setMockPages } from "./msw/pagesApiHandlers";
import { setMockWords } from "./msw/wordsApiHandlers";
import {
  renderViewerPage,
  setupDefaultViewerMocks,
} from "./ViewerPage.test-utils";

beforeEach(() => {
  setupDefaultViewerMocks();
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
      setMockPages(sortMockPages);
      setMockWords(sortMockWords[key]);
      const { unmount } = renderViewerPage();

      await screen.findByRole("cell", { name: expected[0] });
      const orderedContents = screen
        .getAllByRole("row")
        .map((row) => within(row).getByRole("cell").textContent);

      expect(orderedContents).toEqual(expected);
      unmount();
    }
  });
});
