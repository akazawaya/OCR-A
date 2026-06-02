import { http, HttpResponse } from "msw";

import { defaultMockWords, ocrPreviewMock } from "./fixture";

let words = structuredClone(defaultMockWords);
let ocrPreview = structuredClone(ocrPreviewMock);
let ocrPreviewWaitPromise = null;

export const resetMockWords = () => {
  words = structuredClone(defaultMockWords);
  ocrPreview = structuredClone(ocrPreviewMock);
  ocrPreviewWaitPromise = null;
};
export const setMockWords = (anotherFixtute) => {
  words = structuredClone(anotherFixtute);
};
export const setMockOcrPreview = (anotherFixture) => {
  ocrPreview = structuredClone(anotherFixture);
};

// isOcring中の動作の確認用にpromiseを定義する
// createMockOcrPreviewGate()により、内部に未解決のpromise(ocrPreviewWaitPromise)を作成
// release()のメソッド実行により、promiseが解決される
export const createMockOcrPreviewGate = () => {
  let resolveOcrPreview;
  ocrPreviewWaitPromise = new Promise((resolve) => {
    resolveOcrPreview = resolve;
  });
  return {
    release: () => {
      resolveOcrPreview();
      ocrPreviewWaitPromise = null;
    },
  };
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

  // wordのocrは、返り値の差し変えをfixture形式からimport可能にする
  http.post("http://test.dummy/words/ocr-preview/", async ({ request }) => {
    const body = await request.json();
    if (!["replace_words", "rewrite_content"].includes(body.mode)) {
      return new HttpResponse(null, { status: 400 });
    }
    if (ocrPreviewWaitPromise) {
      await ocrPreviewWaitPromise;
    }
    const response = ocrPreview;
    return HttpResponse.json({
      ...response,
      preview_id: body.preview_id,
    });
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
