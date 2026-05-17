import { http, HttpResponse } from "msw";

import { defaultMockPages } from "./fixture";

let pages = structuredClone(defaultMockPages);

export const pagesApiHandlers = [
  http.get(`http://test.dummy/pages/:id/`, ({ params }) => {
    const id = Number(params.id);
    const page = pages.find((p) => p.id === id);
    return HttpResponse.json(page);
  }),
];
