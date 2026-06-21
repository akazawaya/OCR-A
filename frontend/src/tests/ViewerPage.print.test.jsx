// @vitest-environment jsdom

import { beforeEach, describe, expect, test } from "vitest";
import { waitFor } from "@testing-library/react";

import {
  mockUsePrint,
  renderViewerPage,
  setupDefaultViewerMocks,
} from "./ViewerPage.test-utils";

const expectedFileName = "alpha-report.pdf";

beforeEach(() => {
  setupDefaultViewerMocks();
});

describe("ViewerPage print", () => {
  test("Documentのファイル名を印刷タイトルへ設定する", async () => {
    renderViewerPage();

    await waitFor(() => {
      expect(mockUsePrint).toHaveBeenCalledWith(
        expect.objectContaining({
          documentTitle: `電子化出力_${expectedFileName}`,
        }),
      );
    });
  });
});
