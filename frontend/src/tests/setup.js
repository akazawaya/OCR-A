import { beforeAll, beforeEach, afterEach, afterAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { setupServer } from "msw/node";

import { documentsApiHandlers } from "./msw/documentsApiHandlers";
import { MOCK_API_BASE_URL } from "./msw/config";
import { pagesApiHandlers } from "./msw/pagesApiHandlers";
import { wordsApiHandlers } from "./msw/wordsApiHandlers";
import { wsHandlers } from "./msw/wsHandlers";

const server = setupServer(
  ...documentsApiHandlers,
  ...pagesApiHandlers,
  ...wordsApiHandlers,
  ...wsHandlers,
);

// appConfigのimport時の初期化が通るように、ダミーの環境変数を設定
vi.stubEnv("VITE_API_BASE_URL", `${MOCK_API_BASE_URL}/`);

beforeAll(() => {
  server.listen();
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
