// @vitest-environment jsdom

import { beforeEach, describe, expect, test } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import { defaultMockWords } from "./msw/fixture";
import { setMockWords } from "./msw/wordsApiHandlers";
import {
  renderViewerPage,
  setupCanvasTextMeasureMock,
  setupDefaultViewerMocks,
} from "./ViewerPage.test-utils";

beforeEach(() => {
  setupDefaultViewerMocks();
  setupCanvasTextMeasureMock();
});

describe("ViewerPage.ViewerOptionsPanel", () => {
  test("ViewerTopBarからViewerOptionsPanelを開き、検出信頼度の列を即時に追加・削除できる", async () => {
    setMockWords(defaultMockWords);
    renderViewerPage();
    const user = userEvent.setup();

    await screen.findByRole("cell", { name: "テスト語" });
    expect(
      screen.queryByRole("columnheader", { name: "検出信頼度" }),
    ).toBeNull();

    await user.click(screen.getByRole("button", { name: "表示設定" }));

    const detectionScoreCheckbox = screen.getByRole("checkbox", {
      name: "検出信頼度",
    });
    expect(detectionScoreCheckbox).toBeVisible();
    expect(detectionScoreCheckbox).not.toBeChecked();

    await user.click(detectionScoreCheckbox);

    await waitFor(() => {
      expect(
        screen.getByRole("columnheader", { name: "検出信頼度" }),
      ).toBeVisible();
      expect(screen.getByRole("cell", { name: "80%" })).toBeVisible();
    });

    await user.click(detectionScoreCheckbox);

    expect(
      screen.queryByRole("columnheader", { name: "検出信頼度" }),
    ).toBeNull();
  });
});
