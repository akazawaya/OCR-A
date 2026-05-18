import { http, HttpResponse } from "msw";

import { defaultMockWords } from "./fixture";

let words = structuredClone(defaultMockWords);
export const resetMockWords = () => {
  words = structuredClone(defaultMockWords);
};
export const setMockWords = (anotherFixtute) => {
  words = structuredClone(anotherFixtute);
};

export const wordsApiHandlers = [
  http.get("http://test.dummy/words/", ({ request }) => {
    const url = new URL(request.url);
    const pageDoc = url.searchParams.get("page__doc");

    const filteredWords = pageDoc
      ? words.filter((word) => String(word.page__doc) === pageDoc)
      : words;

    return HttpResponse.json(filteredWords);
  }),

  http.get(`http://test.dummy/words/:id/`, ({ params }) => {
    const id = Number(params.id);
    const word = words.find((w) => w.id === id);
    return HttpResponse.json(word);
  }),

  http.delete(`http://test.dummy/words/:id/`, ({ params }) => {
    const id = Number(params.id);
    words = words.filter((p) => p.id !== id);
    return new HttpResponse(null, { status: 204 });
  }),
];
