import { http, HttpResponse } from "msw";

import { defaultMockDocuments } from "./fixture";

let documents = structuredClone(defaultMockDocuments);

export const handlers = [
  http.get(`http://test.dummy/documents/`, () => {
    return HttpResponse.json(documents);
  }),

  http.delete(`http://test.dummy/documents/:id/`, ({ params }) => {
    const id = Number(params.id);
    documents = documents.filter((document) => document.id !== id);
    return new HttpResponse(null, { status: 204 });
  }),
];
