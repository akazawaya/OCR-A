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

export const handlers = [
  http.get(`http://test.dummy/documents/`, () => {
    return HttpResponse.json(documents);
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
