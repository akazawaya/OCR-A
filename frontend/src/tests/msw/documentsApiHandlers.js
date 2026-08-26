import { http, HttpResponse } from "msw";

import { MOCK_API_BASE_URL } from "./config";
import { defaultMockDocuments } from "./fixture";

let documents = structuredClone(defaultMockDocuments);

// DELETE後の一覧再取得を再現するためdocumentsは可変
// 削除状態が別テストへ漏れないよう、各テスト前に初期化する
export const resetMockDocuments = () => {
  documents = structuredClone(defaultMockDocuments);
};

export const documentsApiHandlers = [
  http.get(`${MOCK_API_BASE_URL}/documents/:id/`, ({ params }) => {
    const id = Number(params.id);
    const document = documents.find((d) => d.id === id);
    return HttpResponse.json(document);
  }),

  http.get(`${MOCK_API_BASE_URL}/documents/`, () => {
    return HttpResponse.json(documents);
  }),

  http.delete(`${MOCK_API_BASE_URL}/documents/:id/`, ({ params }) => {
    const id = Number(params.id);
    documents = documents.filter((document) => document.id !== id);
    return new HttpResponse(null, { status: 204 });
  }),
];
