// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { beforeEach, describe, expect, test, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";

import { getCollection as mockGetCollection } from "../api/clients/collectionClient";

import { renderDocumentsPage } from "./DocumentsPage.test-utils";
import { defaultMockDocuments } from "./msw/fixture";
import { sendDocumentChanged } from "./msw/wsHandlers";

vi.mock("../api/clients/collectionClient", () => ({
  getCollection: vi.fn(),
}));

beforeEach(() => {
  mockGetCollection.mockReset();
  mockGetCollection.mockResolvedValue(defaultMockDocuments);
});
// Document OCRのfrontend責務は再取得の発火だけだが、
// WSイベントとquery invalidationの連携を保証するため、明示的にテストする。
describe("DocumentsPage WebSocket", () => {
  test("document_changedを受信するとDocument一覧を再取得する", async () => {
    renderDocumentsPage();

    expect(
      await screen.findByRole("cell", { name: "alpha-report.pdf" }),
    ).toBeVisible();
    expect(mockGetCollection).toHaveBeenCalledTimes(1);

    // OCRの状態遷移ごとに複数のWS通知が届く可能性があるため、総call回数には依存しない。
    // 初期表示のcall履歴を除外し、1件のWS通知による再取得だけを検証する。
    mockGetCollection.mockClear();
    sendDocumentChanged();

    await waitFor(() => {
      expect(mockGetCollection).toHaveBeenCalledTimes(1);
    });
  });
});
