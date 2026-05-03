// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import { renderDocumentsPage } from "./DocumentsPage.test-utils";

const { mockGetCollection, mockStartOcrDocument, mockDeleteCollectionItem } =
  vi.hoisted(() => ({
    mockGetCollection: vi.fn(),
    mockStartOcrDocument: vi.fn(),
    mockDeleteCollectionItem: vi.fn(),
  }));

class MockWebSocket {
  close() {}
}

vi.stubGlobal("WebSocket", MockWebSocket);

vi.mock("../api/clients/collectionClient", () => ({
  getCollection: mockGetCollection,
}));

vi.mock("../api/clients/mutationClient", () => ({
  startOcrDocument: mockStartOcrDocument,
  deleteCollectionItem: mockDeleteCollectionItem,
}));

beforeEach(() => {
  mockGetCollection.mockResolvedValue([]);
  mockDeleteCollectionItem.mockResolvedValue({});
});

describe("DocumentsPage file input", () => {
  test("正常系:選択ファイルがOCR実行へ送信される", async () => {
    mockStartOcrDocument.mockResolvedValue({});
    const user = userEvent.setup();
    const { container } = renderDocumentsPage();
    const fileInput = container.querySelector("#document-file-input");
    const file = new File(["dummy"], "sample.jpg", { type: "image/jpeg" });

    expect(fileInput).not.toBeNull();
    await user.upload(fileInput, file);

    expect(screen.getByText("sample.jpg")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "OCR実行" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "OCR実行" }));

    await waitFor(() => expect(mockStartOcrDocument).toHaveBeenCalledTimes(1));
    const [{ formData }] = mockStartOcrDocument.mock.calls[0];
    expect(formData.get("file")).toBeInstanceOf(File);
    expect(formData.get("file").name).toBe("sample.jpg");
  });

  test("異常系:送信失敗時にエラーをアラート表示する", async () => {
    const alertSpy = vi.fn();
    vi.stubGlobal("alert", alertSpy);
    mockStartOcrDocument.mockRejectedValue({
      data: { file: ["拡張子が非対応です。"] },
      message: "HTTP Error:400",
    });

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
