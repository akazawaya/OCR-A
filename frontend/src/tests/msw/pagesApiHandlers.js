import { http, HttpResponse } from "msw";

import { MOCK_API_BASE_URL } from "./config";
import { defaultMockPages } from "./fixture";

let pages = structuredClone(defaultMockPages);

export const resetMockPages = () => {
  pages = structuredClone(defaultMockPages);
};
export const setMockPages = (anotherFixture) => {
  pages = structuredClone(anotherFixture);
};

export const pagesApiHandlers = [
  http.get(`${MOCK_API_BASE_URL}/pages/`, () => HttpResponse.json(pages)),

  http.get(`${MOCK_API_BASE_URL}/pages/:id/`, ({ params }) => {
    const id = Number(params.id);
    const page = pages.find((p) => p.id === id);
    return HttpResponse.json(page);
  }),
];
