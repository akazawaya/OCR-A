import { http, HttpResponse } from "msw";

import { defaultMockWords, ocrJobMock } from "./fixture";
import { emitMockWebSocketMessage } from "./webSocketMock";

let words = structuredClone(defaultMockWords);
let previewJobId = ocrJobMock.previewJobId;
let ocrResultByPreviewJobId = new Map([
  [ocrJobMock.previewJobId, structuredClone(ocrJobMock.result)],
]);
let ocrWaitPromise = null;

export const resetMockWords = () => {
  words = structuredClone(defaultMockWords);
  previewJobId = ocrJobMock.previewJobId;
  ocrResultByPreviewJobId = new Map([
    [ocrJobMock.previewJobId, structuredClone(ocrJobMock.result)],
  ]);
  ocrWaitPromise = null;
};
export const setMockWords = (anotherFixtute) => {
  words = structuredClone(anotherFixtute);
};
export const setMockOcr = (anotherFixture) => {
  ocrResultByPreviewJobId.set(previewJobId, structuredClone(anotherFixture));
};
export const setMockOcrJob = ({ previewJobId: nextPreviewJobId, result }) => {
  previewJobId = nextPreviewJobId;
  ocrResultByPreviewJobId.set(previewJobId, structuredClone(result));
};

// isOcring中の動作の確認用にpromiseを定義する
// createMockOcrGate()により、内部に未解決のpromise(ocrWaitPromise)を作成
// release()のメソッド実行により、promiseが解決される
export const createMockOcrGate = () => {
  let resolveOcr;
  ocrWaitPromise = new Promise((resolve) => {
    resolveOcr = resolve;
  });
  return {
    release: ({ state = "SUCCESS" } = {}) => {
      resolveOcr();
      ocrWaitPromise = null;
      emitMockWebSocketMessage({
        type: "preview_word_ocr_changed",
        preview_job_id: previewJobId,
        state,
      });
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

  http.post("http://test.dummy/words/ocr/", async ({ request }) => {
    const body = await request.json();
    if (!["replace_words", "rewrite_content"].includes(body.mode)) {
      return new HttpResponse(null, { status: 400 });
    }
    return HttpResponse.json({
      preview_job_id: previewJobId,
    });
  }),

  // wordのocr結果は、返り値の差し替えをfixture形式からimport可能にする
  http.get("http://test.dummy/words/ocr/:previewJobId/", async ({ params }) => {
    if (ocrWaitPromise) {
      await ocrWaitPromise;
    }
    const response = ocrResultByPreviewJobId.get(params.previewJobId);
    if (!response) {
      return HttpResponse.json(null, { status: 404 });
    }
    return HttpResponse.json(structuredClone(response));
  }),
];
