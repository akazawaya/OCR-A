// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest";
import { waitFor } from "@testing-library/react";

import { getCollection as mockGetCollection } from "../api/clients/collectionClient";
import { pageAccessSpec, wordSpec } from "../appConfig";

import {
  renderViewerPage,
  setupDefaultViewerMocks,
} from "./ViewerPage.test-utils";

// getCollectionのMockでroutingQueryの組み立てとqueryFnのcall()をアサートする
vi.mock("../api/clients/collectionClient", async (importOriginal) => ({
  ...(await importOriginal()),
  getCollection: vi.fn(),
}));

beforeEach(() => {
  setupDefaultViewerMocks();
  mockGetCollection.mockReset();
  mockGetCollection.mockResolvedValue([]);
});

// collectionUrlごとにgetCollectionの呼び出しを取得する
// queryStringはオブジェクトへ変換し、クエリパラメータの並び順に依存せず比較する
const expectCollectionQuery = async ({ collectionUrl, expectedQuery }) => {
  await waitFor(() => {
    expect(mockGetCollection).toHaveBeenCalled();

    const matchedCall = mockGetCollection.mock.calls.find(
      ([callArgs]) => callArgs.collectionUrl === collectionUrl,
    );
    expect(matchedCall).toBeDefined();

    const [{ queryString }] = matchedCall;
    expect(Object.fromEntries(new URLSearchParams(queryString))).toEqual(
      expectedQuery,
    );
  });
};

describe("ViewerPage routing query", () => {
  test("遷移先のprimaryKeyをPageとWordのqueryStringに反映する", async () => {
    renderViewerPage();

    await expectCollectionQuery({
      collectionUrl: pageAccessSpec.collectionUrl,
      expectedQuery: { doc: "1" },
    });
    await expectCollectionQuery({
      collectionUrl: wordSpec.collectionUrl,
      expectedQuery: { page__doc: "1" },
    });
  });
});
