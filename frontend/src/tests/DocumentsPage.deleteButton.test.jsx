// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import { documentAccessSpec } from "../appConfig";

import {
  defaultMockDocuments,
  renderDocumentsPage,
} from "./DocumentsPage.test-utils";

const { mockGetCollection, mockDeleteCollectionItem } = vi.hoisted(() => ({
  mockGetCollection: vi.fn(),
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
  deleteCollectionItem: mockDeleteCollectionItem,
}));

beforeEach(() => {
  let documents = structuredClone(defaultMockDocuments);
  mockGetCollection.mockImplementation(() => {
    return Promise.resolve(documents);
  });

  mockDeleteCollectionItem.mockImplementation(async ({ id }) => {
    documents = documents.filter((document) => document.id !== id);
    return {};
  });
});

describe("DocumentsPage deleteButton", () => {
  test("削除ボタンを押すと該当DocumentがDocumentTableから消える", async () => {
    renderDocumentsPage();

    const targetCell = await screen.findByRole("cell", {
      name: "beta-report.pdf",
    });
    const targetRow = targetCell.closest("tr");
    expect(targetRow).not.toBeNull();

    const user = userEvent.setup();
    await user.click(within(targetRow).getByRole("button", { name: "削除" }));

    await waitFor(() =>
      expect(mockDeleteCollectionItem).toHaveBeenCalledWith({
        collectionUrl: documentAccessSpec.collectionUrl,
        id: 2,
      }),
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("cell", { name: "beta-report.pdf" }),
      ).toBeNull(),
    );
    expect(
      screen.getByRole("cell", { name: "alpha-report.pdf" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("cell", { name: "gamma-alpha.pdf" }),
    ).toBeInTheDocument();
  });
});
