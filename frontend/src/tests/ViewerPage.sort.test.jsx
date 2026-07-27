// @vitest-environment jsdom

import { beforeEach, describe, expect, test } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import "@testing-library/jest-dom/vitest";

import {
  sortMockPages,
  sortMockWords,
  viewerTableSortMockWords,
} from "./msw/fixture";
import { setMockPages } from "./msw/pagesApiHandlers";
import { setMockWords } from "./msw/wordsApiHandlers";
import {
  renderViewerPage,
  setupDefaultViewerMocks,
} from "./ViewerPage.test-utils";

beforeEach(() => {
  setupDefaultViewerMocks();
});

const getColumnContents = (columnIndex = 0) =>
  screen
    .getAllByRole("cell")
    .filter((cell) => cell.cellIndex === columnIndex)
    .map((cell) => cell.textContent);

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
      const orderedContents = getColumnContents();

      expect(orderedContents).toEqual(expected);
      unmount();
    }
  });

  describe("ViewerTableの列ソート", () => {
    test("本文を昇順で並び替えられる", async () => {
      setMockPages(sortMockPages);
      setMockWords(viewerTableSortMockWords);
      renderViewerPage();
      const user = userEvent.setup();

      await screen.findByRole("cell", { name: "charlie" });
      const contentHeader = screen.getByRole("columnheader", { name: /^本文/ });
      await user.click(contentHeader);

      expect(getColumnContents(contentHeader.cellIndex)).toEqual([
        "alpha",
        "bravo",
        "charlie",
      ]);
    });

    // scoreの並び替え確認は検出信頼度を代表とする
    test("検出信頼度は数値として並び替え、nullは末尾に配置する", async () => {
      setMockPages(sortMockPages);
      setMockWords(viewerTableSortMockWords);
      renderViewerPage();
      const user = userEvent.setup();

      await screen.findByRole("cell", { name: "charlie" });
      await user.click(screen.getByRole("button", { name: "表示設定" }));
      await user.click(screen.getByRole("checkbox", { name: "検出信頼度" }));
      const detectionScoreHeader = screen.getByRole("columnheader", {
        name: /^検出信頼度/,
      });
      await user.click(detectionScoreHeader);

      expect(getColumnContents(detectionScoreHeader.cellIndex)).toEqual([
        "9%",
        "80%",
        "-",
      ]);
    });
  });
});
