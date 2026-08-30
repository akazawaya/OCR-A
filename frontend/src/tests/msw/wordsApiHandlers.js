import { http, HttpResponse } from "msw";

import { PREVIEW_WORD_OCR_STATE } from "../../logic/viewer/previewWordOcrContract";

import { MOCK_API_BASE_URL } from "./config";
import { defaultMockWords, ocrJobMock } from "./fixture";

let words = structuredClone(defaultMockWords);
let previewJobId = ocrJobMock.previewJobId;
let ocrResultByPreviewJobId = new Map([
  [ocrJobMock.previewJobId, structuredClone(ocrJobMock.result)],
]);
let ocrWaitPromise = null;
let deletedWordIds = [];
let postedWordBodies = [];
let patchedWordRequests = [];

export const resetMockWords = () => {
  words = structuredClone(defaultMockWords);
  previewJobId = ocrJobMock.previewJobId;
  ocrResultByPreviewJobId = new Map([
    [ocrJobMock.previewJobId, structuredClone(ocrJobMock.result)],
  ]);
  ocrWaitPromise = null;
  deletedWordIds = [];
  postedWordBodies = [];
  patchedWordRequests = [];
};
export const setMockWords = (anotherFixtute) => {
  words = structuredClone(anotherFixtute);
};
export const setMockOcr = (anotherFixture) => {
  ocrResultByPreviewJobId.set(previewJobId, structuredClone(anotherFixture));
};
export const setMockOcrJob = ({
  previewJobId: nextPreviewJobId = ocrJobMock.previewJobId,
  result = ocrJobMock.result,
} = {}) => {
  previewJobId = nextPreviewJobId;
  ocrResultByPreviewJobId.set(previewJobId, structuredClone(result));
};
export const getMockDeletedWordIds = () => [...deletedWordIds];
export const getMockPostedWordBodies = () => structuredClone(postedWordBodies);
export const getMockPatchedWordRequests = () =>
  structuredClone(patchedWordRequests);

const buildPreviewJobResult = ({ body, rawResult }) => {
  const result = structuredClone(rawResult);
  result.state = PREVIEW_WORD_OCR_STATE.SUCCESS;
  result.mode = body.mode;
  result.preview_id = body.preview_id;

  if (body.mode === "rewrite_content") {
    result.content = rawResult.words.map((word) => word.content ?? "").join("");
    delete result.words;
    delete result.direction;
  }

  if (body.mode === "replace_words") {
    result.words = structuredClone(rawResult.words);
    delete result.content;
    delete result.direction;
  }

  return result;
};

export const wordsApiHandlers = [
  http.get(`${MOCK_API_BASE_URL}/words/`, () => HttpResponse.json(words)),

  http.get(`${MOCK_API_BASE_URL}/words/:id/`, ({ params }) => {
    const id = Number(params.id);
    const word = words.find((w) => w.id === id);
    return HttpResponse.json(word);
  }),

  http.patch(`${MOCK_API_BASE_URL}/words/:id/`, ({ params, request }) => {
    const id = Number(params.id);
    const wordIndex = words.findIndex((w) => w.id === id);
    if (wordIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    return request.json().then((data) => {
      patchedWordRequests.push({ id, body: structuredClone(data) });
      words[wordIndex] = { ...words[wordIndex], ...data };
      return HttpResponse.json(words[wordIndex]);
    });
  }),

  http.post(`${MOCK_API_BASE_URL}/words/`, async ({ request }) => {
    const body = await request.json();
    postedWordBodies.push(structuredClone(body));

    const nextId = Math.max(0, ...words.map((word) => Number(word.id))) + 1;

    const createdWord = {
      id: nextId,
      page: body.page,
      page__page_number: 1,
      page__doc: "1",
      bbox: body.bbox,
      direction: body.direction,
      content: body.content ?? "",
      rec_score: body.rec_score,
      det_score: body.det_score,
    };

    words = [...words, createdWord];

    return HttpResponse.json(createdWord, { status: 201 });
  }),

  http.delete(`${MOCK_API_BASE_URL}/words/:id/`, ({ params }) => {
    const id = Number(params.id);
    deletedWordIds.push(id);
    words = words.filter((p) => p.id !== id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${MOCK_API_BASE_URL}/words/ocr/`, async ({ request }) => {
    const body = await request.json();
    if (!["replace_words", "rewrite_content"].includes(body.mode)) {
      return new HttpResponse(null, { status: 400 });
    }
    const rawResult = ocrResultByPreviewJobId.get(previewJobId);
    ocrResultByPreviewJobId.set(
      previewJobId,
      buildPreviewJobResult({ body, rawResult }),
    );
    return HttpResponse.json({
      preview_job_id: previewJobId,
    });
  }),

  // wordのocr結果は、返り値の差し替えをfixture形式からimport可能にする
  http.get(
    `${MOCK_API_BASE_URL}/words/ocr/:previewJobId/`,
    async ({ params }) => {
      if (ocrWaitPromise) {
        await ocrWaitPromise;
      }
      const response = ocrResultByPreviewJobId.get(params.previewJobId);
      if (!response) {
        return HttpResponse.json(null, { status: 404 });
      }
      return HttpResponse.json(structuredClone(response));
    },
  ),
];
