// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { expect, test } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderDocumentsPage } from "./DocumentsPage.test-utils";

test("Document OCR APIの認可失敗時にエラーを表示する", async () => {
  renderDocumentsPage();
  const user = userEvent.setup();

  await user.upload(
    screen.getByLabelText(/ファイルを選択/),
    new File(["dummy"], "document.pdf", { type: "application/pdf" }),
  );
  await user.click(screen.getByRole("button", { name: "保存＆OCR" }));

  expect(
    await screen.findByText("この操作を実行する権限がありません。"),
  ).toBeVisible();
});
