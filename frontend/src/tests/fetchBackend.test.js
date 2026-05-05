import { beforeEach, describe, expect, test, vi } from "vitest";

beforeEach(() => {
  globalThis.fetch = vi.fn();
});

describe("fetchBackend", () => {
  test("成功時にresとdataを返す", async () => {
    const { fetchBackend } = await import("../api/fetchBackend");

    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ id: 1 }),
    });

    await expect(fetchBackend("documents/")).resolves.toMatchObject({
      data: { id: 1 },
      res: {
        ok: true,
        status: 200,
      },
    });
  });

  test("失敗レスポンスでもthrowせずerrorを返す", async () => {
    const { fetchBackend } = await import("../api/fetchBackend");

    fetch.mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ detail: "エラーです" }),
    });

    await expect(fetchBackend("documents/")).resolves.toMatchObject({
      data: null,
      res: null,
      error: {
        name: "HttpError",
        message: "HTTP Error:400",
        status: 400,
        data: { detail: "エラーです" },
        url: "documents/",
      },
    });
  });

  test("204 No Content ではjson()を呼ばずdataはnullになる", async () => {
    const { fetchBackend } = await import("../api/fetchBackend");
    const jsonSpy = vi.fn();

    fetch.mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers({ "content-type": "application/json" }),
      json: jsonSpy,
    });

    await expect(fetchBackend("documents/")).resolves.toMatchObject({
      data: null,
      res: {
        ok: true,
        status: 204,
      },
    });
    expect(jsonSpy).not.toHaveBeenCalled();
  });

  test("ネットワークエラーではresとdataがnullになる", async () => {
    const { fetchBackend } = await import("../api/fetchBackend");

    fetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(fetchBackend("documents/")).resolves.toEqual({
      res: null,
      data: null,
      error: expect.any(TypeError),
    });
  });

  test("throwOnError有効時はHTTPエラーをHttpErrorとしてthrowする", async () => {
    const { fetchBackend } = await import("../api/fetchBackend");

    fetch.mockResolvedValue({
      ok: false,
      status: 422,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ detail: "validation failed" }),
    });

    await expect(
      fetchBackend("documents/", { throwOnError: true }),
    ).rejects.toMatchObject({
      name: "HttpError",
      message: "HTTP Error:422",
      status: 422,
      data: { detail: "validation failed" },
      url: "documents/",
    });
  });

  test("HttpErrorがcatchに入った場合はresとdataをnullで返す", async () => {
    const { fetchBackend } = await import("../api/fetchBackend");
    const httpError = new Error("HTTP Error:500");
    httpError.name = "HttpError";

    fetch.mockRejectedValue(httpError);

    await expect(fetchBackend("documents/")).resolves.toEqual({
      res: null,
      data: null,
      error: httpError,
    });
  });
});
