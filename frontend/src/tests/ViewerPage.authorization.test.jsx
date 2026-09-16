// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { beforeEach, expect, test } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  renderViewerPage,
  setupCanvasTextMeasureMock,
  setupDefaultViewerMocks,
} from "./ViewerPage.test-utils";
import { setMockGroupPermissions } from "./msw/wordsApiHandlers";

beforeEach(() => {
  setupDefaultViewerMocks();
  setupCanvasTextMeasureMock();
});

test("Word OCR APIの認可失敗時にエラーを表示する", async () => {
  setMockGroupPermissions([]);
  renderViewerPage();
  const user = userEvent.setup();

  await user.click(await screen.findByRole("button", { name: "編集" }));
  await user.click((await screen.findAllByDisplayValue("テスト語"))[0]);

  const editToolbar = screen.getByRole("toolbar", {
    name: "編集ツールバー",
  });
  await user.click(
    within(editToolbar).getByRole("button", { name: "OCR書換" }),
  );

  expect(
    await screen.findByText("この操作を実行する権限がありません。"),
  ).toBeVisible();
});
