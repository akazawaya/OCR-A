import { http, HttpResponse } from "msw";

import { defaultMockDocuments } from "./fixture";

let documents = structuredClone(defaultMockDocuments);

let receivedOcrRequestFile = null;

const setReceivedOcrRequestFile = (file) => {
  receivedOcrRequestFile = file;
};
export const getReceivedOcrRequestFile = () => {
  return receivedOcrRequestFile;
};
export const resetReceivedOcrRequestFile = () => {
  receivedOcrRequestFile = null;
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
  http.get("http://test.dummy/documents/", ({ request }) => {
    const queryString = new URL(request.url).search;

    const searched = filterDocumentsBySearch(documents, queryString);
    const sorted = sortDocuments(searched, queryString);

    return HttpResponse.json(sorted);
  }),

  http.delete(`http://test.dummy/documents/:id/`, ({ params }) => {
    const id = Number(params.id);
    documents = documents.filter((document) => document.id !== id);
    return new HttpResponse(null, { status: 204 });
  }),

  // start_ocr のmockは 202/400 のresのみを責務とする
  // 異常系に関しては、エラーハンドリングのバリエーション確認はbackend側の責務とする
  // frontendでは擬似的な拡張子非対応エラーのみmockし、alertの確認に留める
  http.post("http://test.dummy/documents/ocr/", async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get("file");

    setReceivedOcrRequestFile(file);

    if (
      !file ||
      !["image/jpeg", "image/png", "application/pdf"].includes(file.type)
    ) {
      return HttpResponse.json(
        { file: ["拡張子が非対応です。"] },
        { status: 400 },
      );
    }

    return new HttpResponse(null, { status: 202 });
  }),
];
