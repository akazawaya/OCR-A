import { http, HttpResponse } from "msw";

import { defaultMockPages } from "./fixture";

let pages = structuredClone(defaultMockPages);

export const resetMockPages = () => {
  pages = structuredClone(defaultMockPages);
};
export const setMockPages = (anotherFixture) => {
  pages = structuredClone(anotherFixture);
};

export const pagesApiHandlers = [
  http.get("http://test.dummy/pages/", ({ request }) => {
    const url = new URL(request.url);
    const params = url.searchParams;
    const doc = params.get("doc");

    const result = doc
      ? pages.filter((page) => String(page.doc) === doc)
      : pages;

    return HttpResponse.json(result);
  }),

  http.get(`http://test.dummy/pages/:id/`, ({ params }) => {
    const id = Number(params.id);
    const page = pages.find((p) => p.id === id);
    return HttpResponse.json(page);
  }),
];
