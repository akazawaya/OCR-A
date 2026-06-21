import { http, HttpResponse } from "msw";

import { defaultMockDocuments } from "./fixture";

let documents = structuredClone(defaultMockDocuments);

let receivedCreateRequestFile = null;

export const getReceivedCreateRequestFile = () => {
  return receivedCreateRequestFile;
};
export const resetReceivedCreateRequestFile = () => {
  receivedCreateRequestFile = null;
};

// 検索に関しては、DOMツリーへの反映確認を責務とする。
// 詳細な検索仕様の検証は backend 側で担う。
// frontend テストでは lookup_expr / keyword_operator / field_name は再現せず、
// keyword による file_name の部分一致のみを簡易的に再現する。
const filterDocumentsBySearch = (documents, queryString) => {
  const params = new URLSearchParams(queryString || "");
  const keyword = (params.get("keyword") || "").trim().toLowerCase();

  if (!keyword) return documents;

  return documents.filter((document) =>
    String(document.file_name).toLowerCase().includes(keyword),
  );
};

const sortDocuments = (documents, queryString) => {
  const params = new URLSearchParams(queryString || "");
  const ordering = params.get("ordering") || "";

  if (!ordering) return documents;

  const isDesc = ordering.startsWith("-");
  const field = isDesc ? ordering.slice(1) : ordering;
  const sorted = [...documents].sort((a, b) =>
    String(a[field] || "").localeCompare(String(b[field] || "")),
  );

  return isDesc ? sorted.reverse() : sorted;
};

export const documentsApiHandlers = [
  http.get("http://test.dummy/documents/:id/", ({ params }) => {
    const id = Number(params.id);
    const document = documents.find((d) => d.id === id);
    return HttpResponse.json(document);
  }),

  http.get("http://test.dummy/documents/", ({ request }) => {
    const queryString = new URL(request.url).search;

    const searched = filterDocumentsBySearch(documents, queryString);
    const sorted = sortDocuments(searched, queryString);

    return HttpResponse.json(sorted);
  }),

  // create の mock は、アップロード導線の代表確認を責務とする。
  // 詳細なファイル検証は backend 側で担う。
  // frontend では擬似的な拡張子非対応エラーのみ mock し、alert の確認に留める。
  http.post("http://test.dummy/documents/", async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get("file");

    receivedCreateRequestFile = file;

    if (
      !file ||
      !["image/jpeg", "image/png", "application/pdf"].includes(file.type)
    ) {
      return HttpResponse.json(
        { file: ["拡張子が非対応です。"] },
        { status: 400 },
      );
    }

    return HttpResponse.json(
      { id: 999, file_name: file.name },
      { status: 201 },
    );
  }),

  http.delete(`http://test.dummy/documents/:id/`, ({ params }) => {
    const id = Number(params.id);
    documents = documents.filter((document) => document.id !== id);
    return new HttpResponse(null, { status: 204 });
  }),

  // ocr のmockはfrontendで確認できる範囲はcreateでカバーできているとみなし、
  // user.clickで呼ばれたかを見る程度に留める
  http.post("http://test.dummy/documents/ocr/", async () => {
    return new HttpResponse(null, { status: 202 });
  }),
];
