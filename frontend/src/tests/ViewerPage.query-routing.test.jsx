// @vitest-environment jsdom

import { beforeEach, describe, expect, test } from "vitest";
import { screen, within } from "@testing-library/react";

import "@testing-library/jest-dom/vitest";

import { setMockPages } from "./msw/pagesApiHandlers";
import { setMockWords } from "./msw/wordsApiHandlers";
import { queryRoutingMockPages, queryRoutingMockWords } from "./msw/fixture";
import {
  renderViewerPage,
  setupDefaultViewerMocks,
} from "./ViewerPage.test-utils";

beforeEach(() => {
  setupDefaultViewerMocks();
  setMockPages(queryRoutingMockPages);
  setMockWords(queryRoutingMockWords);
});

describe("ViewerPage routing query", () => {
  test("routingQuery: 遷移先のprimaryKeyにより表示データの絞り込みが発生する", async () => {
    renderViewerPage();

    // 絞り込みの確認は ViewerTableの<tr>を想定する
    const table = await screen.findByRole("table");
    expect(
      await within(table).findByRole("row", { name: /alpha word/i }),
    ).toBeVisible();

    expect(within(table).queryByRole("row", { name: /beta word/i })).toBeNull();
  });
});
