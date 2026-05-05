import { beforeEach, describe, expect, test, vi } from "vitest";

const { mockFetchBackend } = vi.hoisted(() => ({
  mockFetchBackend: vi.fn(),
}));

vi.mock("../api/fetchBackend", () => ({
  fetchBackend: mockFetchBackend,
}));

beforeEach(() => {
  mockFetchBackend.mockReset();
});

describe("collectionClient", () => {
  test("getCollection:レスポンスdataをそのまま返す", async () => {
    mockFetchBackend.mockResolvedValue({ data: [{ id: 1 }, { id: 2 }] });

    const { getCollection } = await import("../api/clients/collectionClient");
    const result = await getCollection({ collectionUrl: "/documents/" });
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    expect(mockFetchBackend).toHaveBeenCalledWith("/documents/");
  });
});

describe("schemaClient", () => {
  test("getSchema:schemaKeyに対応するschemaを返す", async () => {
    mockFetchBackend.mockResolvedValue({
      data: {
        components: {
          schemas: {
            Document: { type: "object", title: "Document" },
          },
        },
      },
    });

    const { getSchema } = await import("../api/clients/schemaClient");
    const result = await getSchema({
      schemaUrl: "/schema/",
      schemaKey: "Document",
    });

    expect(result).toEqual({ type: "object", title: "Document" });
    expect(mockFetchBackend).toHaveBeenCalledWith("/schema/");
  });
});

describe("mutationClient", () => {
  test("postCollectionItem:JSONをPOSTしてresとdataを返す", async () => {
    mockFetchBackend.mockResolvedValue({
      res: { status: 201 },
      data: { id: 10 },
    });

    const { postCollectionItem } =
      await import("../api/clients/mutationClient");
    const result = await postCollectionItem({
      collectionUrl: "/documents/",
      body: { title: "sample" },
    });

    expect(result).toEqual({ res: { status: 201 }, data: { id: 10 } });
    expect(mockFetchBackend).toHaveBeenCalledWith("/documents/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "sample" }),
      throwOnError: true,
    });
  });

  test("patchCollectionItem:ID付きURLへPATCHする", async () => {
    mockFetchBackend.mockResolvedValue({
      res: { status: 200 },
      data: { id: 10, title: "patched" },
    });

    const { patchCollectionItem } =
      await import("../api/clients/mutationClient");
    const result = await patchCollectionItem({
      collectionUrl: "/documents/",
      id: 10,
      body: { title: "patched" },
    });

    expect(result).toEqual({
      res: { status: 200 },
      data: { id: 10, title: "patched" },
    });
    expect(mockFetchBackend).toHaveBeenCalledWith("/documents/10/", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "patched" }),
      throwOnError: true,
    });
  });

  test("deleteCollectionItem:ID付きURLへDELETEしてresを返す", async () => {
    mockFetchBackend.mockResolvedValue({
      res: { status: 204 },
    });

    const { deleteCollectionItem } =
      await import("../api/clients/mutationClient");
    const result = await deleteCollectionItem({
      collectionUrl: "/documents/",
      id: 10,
    });

    expect(result).toEqual({ status: 204 });
    expect(mockFetchBackend).toHaveBeenCalledWith("/documents/10/", {
      method: "DELETE",
      throwOnError: true,
    });
  });

  test("startOcrDocument:formDataをPOSTしてresとdataを返す", async () => {
    const formData = new FormData();
    formData.append("file", new File(["dummy"], "sample.jpg"));
    mockFetchBackend.mockResolvedValue({
      res: { status: 202 },
      data: { job_id: "abc" },
    });

    const { startOcrDocument } = await import("../api/clients/mutationClient");
    const result = await startOcrDocument({
      startOcrUrl: "/documents/ocr/",
      formData,
    });

    expect(result).toEqual({
      res: { status: 202 },
      data: { job_id: "abc" },
    });
    expect(mockFetchBackend).toHaveBeenCalledWith("/documents/ocr/", {
      method: "POST",
      body: formData,
      throwOnError: true,
    });
  });
});
