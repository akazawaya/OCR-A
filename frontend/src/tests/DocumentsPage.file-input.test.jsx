// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import { renderDocumentsPage } from "./DocumentsPage.test-utils";
import {
  getReceivedCreateRequestFile,
  resetReceivedCreateRequestFile,
} from "./msw/documentsApiHandlers";

beforeEach(() => {
  resetReceivedCreateRequestFile();
});

describe("DocumentsPage upload", () => {
  test("正常系:createでは選択ファイルが保存APIへ送信される", async () => {
    const user = userEvent.setup();
    const { container } = renderDocumentsPage();
    const fileInput = container.querySelector("#document-file-input");
    const file = new File(["dummy"], "sample.jpg", { type: "image/jpeg" });
    expect(fileInput).not.toBeNull();

    await user.upload(fileInput, file);
    expect(screen.getByText("sample.jpg")).toBeVisible();
    expect(screen.getByRole("button", { name: "保存のみ" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "保存のみ" }));

    await waitFor(() => expect(getReceivedCreateRequestFile()).not.toBeNull());
    expect(getReceivedCreateRequestFile().type).toBe("image/jpeg");
  });

  test("異常系:createでは送信失敗時にエラーをアラート表示する", async () => {
    const alertSpy = vi.fn();
    vi.stubGlobal("alert", alertSpy);

    const user = userEvent.setup();
    const { container } = renderDocumentsPage();
    const fileInput = container.querySelector("#document-file-input");
    const file = new File(["dummy"], "sample.txt", { type: "text/plain" });

    expect(fileInput).not.toBeNull();
    await user.upload(fileInput, file);

    await user.click(screen.getByRole("button", { name: "保存のみ" }));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith("拡張子が非対応です。"),
    );
  });

  test("start_ocrでは保存＆OCRボタンを押せる", async () => {
    const user = userEvent.setup();
    const { container } = renderDocumentsPage();
    const fileInput = container.querySelector("#document-file-input");
    const file = new File(["dummy"], "sample.jpg", { type: "image/jpeg" });

    expect(fileInput).not.toBeNull();
    await user.upload(fileInput, file);

    const ocrButton = screen.getByRole("button", { name: "保存＆OCR" });
    expect(ocrButton).toBeEnabled();

    await user.click(ocrButton);
  });
});
