// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { fireEvent, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { renderDocumentsPage } from "./DocumentsPage.test-utils";

test("ドロップしたファイルを選択し、OCR実行ボタンを有効にする", () => {
  renderDocumentsPage();

  const dropTarget = screen.getByText("ファイルを選択").closest("label");
  const file = new File(["dummy"], "dropped-document.pdf", {
    type: "application/pdf",
  });

  fireEvent.dragOver(dropTarget, { dataTransfer: { files: [file] } });

  fireEvent.drop(dropTarget, { dataTransfer: { files: [file] } });

  expect(screen.getByText("dropped-document.pdf")).toBeVisible();
  expect(screen.getByRole("button", { name: "保存＆OCR" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "保存のみ" })).toBeEnabled();
});
