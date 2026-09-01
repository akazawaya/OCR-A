// @vitest-environment jsdom

import { beforeEach, describe, expect, test } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import { defaultMockWords } from "./msw/fixture";
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
  test("パネルを開いた直後に外側を押すと閉じる", async () => {
    renderViewerPage();
    const user = userEvent.setup();

    await screen.findByRole("cell", { name: "テスト語" });
    await user.click(screen.getByRole("button", { name: "表示設定" }));

    expect(screen.getByRole("checkbox", { name: "検出信頼度" })).toBeVisible();

    await user.click(screen.getByRole("cell", { name: "テスト語" }));

    expect(
      screen.queryByRole("checkbox", { name: "検出信頼度" }),
    ).not.toBeInTheDocument();
  });

  test("ViewerTopBarからViewerOptionsPanelを開き、検出信頼度の列を即時に追加・削除できる", async () => {
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
      const detectionScoreCells = screen.getAllByRole("cell", {
        name: "80%",
      });
      expect(detectionScoreCells).toHaveLength(defaultMockWords.length);
      detectionScoreCells.forEach((cell) => {
        expect(cell).toBeVisible();
      });
    });

    await user.click(detectionScoreCheckbox);

    expect(
      screen.queryByRole("columnheader", { name: "検出信頼度" }),
    ).toBeNull();
  });
});
