import { http, HttpResponse } from "msw";

import { MOCK_API_BASE_URL } from "./config";
import { defaultMockDocuments } from "./fixture";

let documents = structuredClone(defaultMockDocuments);
export const MOCK_DOCUMENTS_PER_PAGE = 3;

export const buildPaginatedDocumentsResponse = ({
  documents,
  queryString,
  documentsPerPage,
}) => {
  const params = new URLSearchParams(queryString);
  const currentPage = Number(params.get("page") ?? 1);
  const start = (currentPage - 1) * documentsPerPage;

  return {
    current_page: currentPage,
    pagination_total_pages: Math.max(
      1,
      Math.ceil(documents.length / documentsPerPage),
    ),
    results: documents.slice(start, start + documentsPerPage),
  };
};

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

  http.get(`${MOCK_API_BASE_URL}/documents/`, ({ request }) => {
    return HttpResponse.json(
      buildPaginatedDocumentsResponse({
        documents,
        queryString: new URL(request.url).search,
        documentsPerPage: MOCK_DOCUMENTS_PER_PAGE,
      }),
    );
  }),

  http.delete(`${MOCK_API_BASE_URL}/documents/:id/`, ({ params }) => {
    const id = Number(params.id);
    documents = documents.filter((document) => document.id !== id);
    return new HttpResponse(null, { status: 204 });
  }),
];
