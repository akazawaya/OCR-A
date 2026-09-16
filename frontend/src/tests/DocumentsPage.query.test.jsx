// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import { getCollection as mockGetCollection } from "../api/clients/collectionClient";
import { documentSpec } from "../appConfig";

import { renderDocumentsPage } from "./DocumentsPage.test-utils";
import {
  buildPaginatedDocumentsResponse,
  MOCK_DOCUMENTS_PER_PAGE,
} from "./msw/documentsApiHandlers";
import {
  defaultMockPaginatedDocumentsResponse,
  paginationMockDocuments,
} from "./msw/fixture";

// getCollectionのMockでurlQueryの組み立てとqueryFnのcall()をアサートする
vi.mock("../api/clients/collectionClient", () => ({
  getCollection: vi.fn(),
}));

beforeEach(() => {
  mockGetCollection.mockReset();
  mockGetCollection.mockResolvedValue(defaultMockPaginatedDocumentsResponse);
});

// getCollectionの呼び出しと、最後の呼び出しに渡された引数を検証する関数
// queryStringはオブジェクトへ変換し、クエリパラメータの並び順に依存せず比較する
const expectLastCollectionQuery = async (expectedQuery) => {
  await waitFor(() => {
    // callも確認
    expect(mockGetCollection).toHaveBeenCalled();

    const [{ collectionUrl, queryString }] =
      mockGetCollection.mock.calls.at(-1);

    expect(collectionUrl).toBe(documentSpec.collectionUrl);
    expect(Object.fromEntries(new URLSearchParams(queryString))).toEqual(
      expectedQuery,
    );
  });
};

const paginationMockTotalPages = Math.ceil(
  paginationMockDocuments.length / MOCK_DOCUMENTS_PER_PAGE,
);
const firstPageDocument = paginationMockDocuments[0];
const lastPageDocument = paginationMockDocuments.at(-1);

const expectLocationQuery = async (expectedQuery) => {
  await waitFor(() => {
    const locationText = screen.getByTestId("location-display").textContent;
    const [pathname, queryString = ""] = locationText.split("?");

    expect(pathname).toBe("/documents");
    expect(Object.fromEntries(new URLSearchParams(queryString))).toEqual(
      expectedQuery,
    );
  });
};

describe("DocumentsPage query", () => {
  describe("searchQuery", () => {
    test("検索を実行するとキーワードと初期検索オプションが反映される", async () => {
      renderDocumentsPage();

      const keywordInput = screen.getByRole("textbox");
      const user = userEvent.setup();
      await user.type(keywordInput, "beta");
      await user.click(screen.getByRole("button", { name: "検索" }));
      await expectLastCollectionQuery({
        keyword: "beta",
        field_name: "both",
        lookup_expr: "icontains",
        keyword_operator: "or",
      });
    });

    test("検索後にリセットすると入力値とqueryStringが初期状態に戻る", async () => {
      renderDocumentsPage();

      const user = userEvent.setup();
      const keywordInput = screen.getByRole("textbox");

      await user.type(keywordInput, "beta");
      await user.click(screen.getByLabelText("ファイル名"));
      await user.click(screen.getByLabelText("完全一致"));
      await user.click(screen.getByLabelText("AND"));
      await user.click(screen.getByRole("button", { name: "検索" }));

      expect(screen.getByDisplayValue("beta")).toBeVisible();
      await expectLastCollectionQuery({
        keyword: "beta",
        field_name: "file_name",
        lookup_expr: "exact",
        keyword_operator: "and",
      });

      await user.click(screen.getByRole("button", { name: "リセット" }));

      expect(screen.getByRole("textbox")).toHaveValue("");
      expect(screen.getByLabelText("両方")).toBeChecked();
      expect(screen.getByLabelText("部分一致")).toBeChecked();
      expect(screen.getByLabelText("OR")).toBeChecked();
      await expectLastCollectionQuery({});
    });
  });

  describe("sortQuery", () => {
    test("同じ列をクリックすると昇順→降順→解除となる", async () => {
      renderDocumentsPage({
        initialEntry: "/documents?ordering=created",
      });

      expect(
        await screen.findByRole("cell", { name: "alpha-report.pdf" }),
      ).toBeVisible();

      const user = userEvent.setup();
      await user.click(screen.getByRole("columnheader", { name: /^名前/ }));
      await expectLastCollectionQuery({ ordering: "file_name" });

      await user.click(screen.getByRole("columnheader", { name: /^名前/ }));
      await expectLastCollectionQuery({ ordering: "-file_name" });

      await user.click(screen.getByRole("columnheader", { name: /^名前/ }));
      await expectLastCollectionQuery({});
    });
  });

  describe("paginationQuery", () => {
    beforeEach(() => {
      mockGetCollection.mockImplementation(({ queryString }) =>
        Promise.resolve(
          buildPaginatedDocumentsResponse({
            documents: paginationMockDocuments,
            queryString,
            documentsPerPage: MOCK_DOCUMENTS_PER_PAGE,
          }),
        ),
      );
    });

    test("ページネーションresponseの現在ページのDocumentだけを表示する", async () => {
      renderDocumentsPage();

      expect(
        await screen.findByRole("cell", {
          name: firstPageDocument.file_name,
        }),
      ).toBeVisible();
      expect(
        screen.queryByRole("cell", {
          name: lastPageDocument.file_name,
        }),
      ).not.toBeInTheDocument();
    });

    test("ページ数が多くても最終ページボタンから表示ページを変更できる", async () => {
      renderDocumentsPage();
      const user = userEvent.setup();

      expect(
        await screen.findByRole("cell", {
          name: firstPageDocument.file_name,
        }),
      ).toBeVisible();

      const lastPageButton = screen.getByRole("button", {
        name: String(paginationMockTotalPages),
      });
      expect(lastPageButton).toBeVisible();

      await user.click(lastPageButton);

      await expectLocationQuery({
        page: String(paginationMockTotalPages),
      });
      await expectLastCollectionQuery({
        page: String(paginationMockTotalPages),
      });
      expect(
        await screen.findByRole("cell", {
          name: lastPageDocument.file_name,
        }),
      ).toBeVisible();
      expect(
        screen.queryByRole("cell", {
          name: firstPageDocument.file_name,
        }),
      ).not.toBeInTheDocument();
    });

    test("検索時に1ページ目へ戻る", async () => {
      renderDocumentsPage({
        initialEntry: `/documents?page=${paginationMockTotalPages}`,
      });
      const user = userEvent.setup();

      expect(
        await screen.findByRole("cell", {
          name: lastPageDocument.file_name,
        }),
      ).toBeVisible();

      await user.type(screen.getByRole("textbox"), "Document");
      await user.click(screen.getByRole("button", { name: "検索" }));

      const expectedQuery = {
        keyword: "Document",
        field_name: "both",
        lookup_expr: "icontains",
        keyword_operator: "or",
      };
      await expectLocationQuery(expectedQuery);
      await expectLastCollectionQuery(expectedQuery);
      expect(
        await screen.findByRole("cell", {
          name: firstPageDocument.file_name,
        }),
      ).toBeVisible();
    });

    test("ソート時に1ページ目へ戻る", async () => {
      renderDocumentsPage({
        initialEntry: `/documents?page=${paginationMockTotalPages}`,
      });
      const user = userEvent.setup();

      expect(
        await screen.findByRole("cell", {
          name: lastPageDocument.file_name,
        }),
      ).toBeVisible();

      await user.click(screen.getByRole("columnheader", { name: /^名前/ }));

      const expectedQuery = { ordering: "file_name" };
      await expectLocationQuery(expectedQuery);
      await expectLastCollectionQuery(expectedQuery);
      expect(
        await screen.findByRole("cell", {
          name: firstPageDocument.file_name,
        }),
      ).toBeVisible();
    });
  });

  describe("routingQuery", () => {
    test("完了したDocumentの行クリックでviewerへページ遷移する", async () => {
      renderDocumentsPage();

      const targetCell = await screen.findByRole("cell", {
        name: "alpha-report.pdf",
      });
      const user = userEvent.setup();
      await user.click(targetCell);

      expect(screen.getByTestId("location-display")).toHaveTextContent(
        "/documents/1/viewer",
      );
    });

    test("完了していないDocumentの行クリックではviewerへ遷移しない", async () => {
      renderDocumentsPage();

      const targetCell = await screen.findByRole("cell", {
        name: "beta-report.pdf",
      });
      const user = userEvent.setup();
      await user.click(targetCell);

      expect(screen.getByTestId("location-display")).toHaveTextContent(
        "/documents",
      );
    });
  });
});
