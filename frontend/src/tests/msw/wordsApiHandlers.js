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

  http.patch(`http://test.dummy/words/:id/`, ({ params, request }) => {
    const id = Number(params.id);
    const wordIndex = words.findIndex((w) => w.id === id);
    if (wordIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    return request.json().then((data) => {
      words[wordIndex] = { ...words[wordIndex], ...data };
      return HttpResponse.json(words[wordIndex]);
    });
  }),

  http.post("http://test.dummy/words/", async ({ request }) => {
    const body = await request.json();

    const nextId = Math.max(0, ...words.map((word) => Number(word.id))) + 1;

    const createdWord = {
      id: nextId,
      page: body.page,
      page__page_number: 1,
      page__doc: "1",
      bbox: body.bbox,
      direction: body.direction,
      content: body.content ?? "",
    };

    words = [...words, createdWord];

    return HttpResponse.json(createdWord, { status: 201 });
  }),

  http.post("http://test.dummy/words/ocr-preview/", async ({ request }) => {
    const body = await request.json();

    if (body.mode === "replace_words") {
      return HttpResponse.json({
        mode: body.mode,
        preview_id: body.preview_id,
        words: [
          {
            bbox: [
              [100, 100],
              [150, 100],
              [150, 150],
              [100, 150],
            ],
            direction: 1,
            content: "分割A",
          },
          {
            bbox: [
              [150, 100],
              [200, 100],
              [200, 150],
              [150, 150],
            ],
            direction: 1,
            content: "分割B",
          },
        ],
      });
    }

    if (body.mode === "rewrite_content") {
      return HttpResponse.json({
        mode: body.mode,
        preview_id: body.preview_id,
        content: "書換後",
      });
    }

    return new HttpResponse(null, { status: 400 });
  }),

  http.patch("http://test.dummy/words/:id/", async ({ params, request }) => {
    const id = Number(params.id);
    const body = await request.json();
    const index = words.findIndex((word) => Number(word.id) === id);

    if (index === -1) {
      return HttpResponse.json({ detail: "Not found." }, { status: 404 });
    }

    words[index] = {
      ...words[index],
      ...body,
    };

    return HttpResponse.json(words[index]);
  }),

  http.delete(`http://test.dummy/words/:id/`, ({ params }) => {
    const id = Number(params.id);
    words = words.filter((p) => p.id !== id);
    return new HttpResponse(null, { status: 204 });
  }),
];
