import { beforeAll, beforeEach, afterEach, afterAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { setupServer } from "msw/node";

import { handlers } from "./msw/handlers";

const server = setupServer(...handlers);

// appConfigのimport時の初期化が通るように、ダミーの環境変数を設定
vi.stubEnv("VITE_API_BASE_URL", "http://test.dummy/");

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
