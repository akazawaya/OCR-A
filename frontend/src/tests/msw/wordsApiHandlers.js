import { http, HttpResponse } from "msw";

import { defaultMockWords } from "./fixture";

let words = structuredClone(defaultMockWords);

export const wordsApiHandlers = [
  http.get(`http://test.dummy/words/:id/`, ({ params }) => {
    const id = Number(params.id);
    const word = words.find((w) => w.id === id);
    return HttpResponse.json(word);
  }),
];
