import { beforeEach, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// appConfigのimport時の初期化が通るように、ダミーの環境変数を設定
vi.stubEnv("VITE_API_BASE_URL", "http://test.dummy/");

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});
