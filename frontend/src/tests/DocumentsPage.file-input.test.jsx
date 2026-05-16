// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import { renderDocumentsPage } from "./DocumentsPage.test-utils";
import {
  getReceivedOcrRequestFile,
  resetReceivedOcrRequestFile,
} from "./msw/handlers";

beforeEach(() => {
  resetReceivedOcrRequestFile();
});

describe("DocumentsPage file input", () => {
  test("正常系:選択ファイルがOCR実行へ送信される", async () => {
    const user = userEvent.setup();
    const { container } = renderDocumentsPage();
    const fileInput = container.querySelector("#document-file-input");
    const file = new File(["dummy"], "sample.jpg", { type: "image/jpeg" });
    expect(fileInput).not.toBeNull();

    await user.upload(fileInput, file);
    expect(screen.getByText("sample.jpg")).toBeVisible();
    expect(screen.getByRole("button", { name: "OCR実行" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "OCR実行" }));

    await waitFor(() => expect(getReceivedOcrRequestFile()).not.toBeNull());
    expect(getReceivedOcrRequestFile().type).toBe("image/jpeg");
  });

  test("異常系:送信失敗時にエラーをアラート表示する", async () => {
    const alertSpy = vi.fn();
    vi.stubGlobal("alert", alertSpy);

    const user = userEvent.setup();
    const { container } = renderDocumentsPage();
    const fileInput = container.querySelector("#document-file-input");
    const file = new File(["dummy"], "sample.txt", { type: "text/plain" });

    expect(fileInput).not.toBeNull();
    await user.upload(fileInput, file);

    await user.click(screen.getByRole("button", { name: "OCR実行" }));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith("拡張子が非対応です。"),
    );
  });
});
