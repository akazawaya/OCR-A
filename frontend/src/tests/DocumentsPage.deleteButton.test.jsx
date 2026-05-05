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
  mockDeleteCollectionItem.mockResolvedValue({});

  let documents = structuredClone(defaultMockDocuments);
  mockGetCollection.mockImplementation(({ collectionUrl, queryString }) => {
    if (collectionUrl !== documentAccessSpec.collectionUrl) {
      return Promise.resolve([]);
    }

    const params = new URLSearchParams(queryString || "");
    const keyword = (params.get("keyword") || "").trim().toLowerCase();
    const fieldName = params.get("field_name") || "both";
    const ordering = params.get("ordering") || "";

    let nextDocuments = documents;
    if (keyword) {
      nextDocuments = nextDocuments.filter((document) => {
        const fileName = String(document.file_name || "").toLowerCase();
        const state = String(document.state || "").toLowerCase();

        if (fieldName === "file_name") return fileName.includes(keyword);
        return fileName.includes(keyword) || state.includes(keyword);
      });
    }

    if (ordering) {
      const isDesc = ordering.startsWith("-");
      const field = isDesc ? ordering.slice(1) : ordering;
      const sorted = [...nextDocuments].sort((a, b) =>
        String(a[field] || "").localeCompare(String(b[field] || "")),
      );
      nextDocuments = isDesc ? sorted.reverse() : sorted;
    }

    return Promise.resolve(nextDocuments);
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
