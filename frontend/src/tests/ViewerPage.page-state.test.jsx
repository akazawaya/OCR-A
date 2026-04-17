// @vitest-environment jsdom

import { beforeEach, describe, test, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  defaultMockPages,
  renderViewerPage,
  setupDefaultViewerMocks,
  setupResizeObserverMock,
} from "./ViewerPage.test-utils";

const {
  mockUsePrint,
  mockGetCollection,
  mockPostCollectionItem,
  mockDeleteCollectionItem,
  mockPatchCollectionItem,
} = vi.hoisted(() => ({
  mockUsePrint: vi.fn(),
  mockGetCollection: vi.fn(),
  mockPostCollectionItem: vi.fn(),
  mockDeleteCollectionItem: vi.fn(),
  mockPatchCollectionItem: vi.fn(),
}));

HTMLElement.prototype.scrollIntoView = vi.fn();

vi.mock("../logic/print/usePrint", () => ({
  usePrint: mockUsePrint,
}));

vi.mock("../api/clients/collectionClient", () => ({
  getCollection: mockGetCollection,
}));

vi.mock("../api/clients/mutationClient", () => ({
  postCollectionItem: mockPostCollectionItem,
  deleteCollectionItem: mockDeleteCollectionItem,
  patchCollectionItem: mockPatchCollectionItem,
}));

setupResizeObserverMock();

Object.defineProperty(HTMLElement.prototype, "clientWidth", {
  configurable: true,
  get() {
    return defaultMockPages[0].width_px;
  },
});

Object.defineProperty(HTMLElement.prototype, "clientHeight", {
  configurable: true,
  get() {
    return defaultMockPages[0].height_px;
  },
});

beforeEach(() => {
  setupDefaultViewerMocks({
    mockUsePrint,
    mockGetCollection,
  });
});

describe("ViewerPage", () => {
  test("次ページボタンを押すと対象ページへスクロールする", async () => {
    renderViewerPage();
    const nextButton = await screen.findByRole("button", { name: "次" });
    let page2;
    await waitFor(() => {
      page2 = document.querySelector('[data-page="2"]');
      expect(page2).not.toBeNull();
    });
    const mockScrollIntoView = vi.fn();
    page2.scrollIntoView = mockScrollIntoView;
    const user = userEvent.setup();
    await user.click(nextButton);
    expect(mockScrollIntoView).toHaveBeenCalled();
  });

  test("拡大・縮小ボタンを押すと画像サイズが更新される", async () => {
    renderViewerPage();
    const zoomUpButton = await screen.findByRole("button", { name: "拡大" });
    const zoomDownButton = await screen.findByRole("button", { name: "縮小" });
    const imageTransform = await screen.findByTestId(
      "viewer-image-transform-1",
    );
    expect(mockGetCollection).toHaveBeenCalled();
    expect(imageTransform.style.width).toBe("1000px");
    expect(imageTransform.style.height).toBe("800px");
    const user = userEvent.setup();
    await user.click(zoomUpButton);
    expect(imageTransform.style.width).toBe("1250px");
    expect(imageTransform.style.height).toBe("1000px");
    await user.click(zoomDownButton);
    expect(imageTransform.style.width).toBe("1000px");
    expect(imageTransform.style.height).toBe("800px");
  });

  test("回転ボタンを押すと画像の回転角度が更新される", async () => {
    renderViewerPage();
    const rotateButton = await screen.findByRole("button", { name: "回転" });
    const imageTransform = await screen.findByTestId(
      "viewer-image-transform-1",
    );
    expect(imageTransform.style.getPropertyValue("--rotate")).toBe("0deg");
    const user = userEvent.setup();
    await user.click(rotateButton);
    expect(imageTransform.style.getPropertyValue("--rotate")).toBe("90deg");
  });

  test("ページ番号を入力してEnterを押すと対象ページへスクロールする", async () => {
    renderViewerPage();
    let page2;
    await waitFor(() => {
      page2 = document.querySelector('[data-page="2"]');
      expect(page2).not.toBeNull();
    });
    const mockScrollIntoView = vi.fn();
    page2.scrollIntoView = mockScrollIntoView;
    const pageInput = await screen.findByRole("textbox", { name: "page" });
    const user = userEvent.setup();
    await user.clear(pageInput);
    await user.type(pageInput, "2{Enter}");
    expect(mockScrollIntoView).toHaveBeenCalled();
  });

  test("倍率を入力してEnterを押すと画像サイズが更新される", async () => {
    renderViewerPage();
    const imageTransform = await screen.findByTestId(
      "viewer-image-transform-1",
    );
    expect(imageTransform.style.width).toBe("1000px");
    expect(imageTransform.style.height).toBe("800px");
    const zoomInput = await screen.findByRole("textbox", { name: "zoom" });
    const user = userEvent.setup();
    await user.clear(zoomInput);
    await user.type(zoomInput, "125{Enter}");
    expect(imageTransform.style.width).toBe("1250px");
    expect(imageTransform.style.height).toBe("1000px");
  });

  test("回転角度を入力してEnterを押すと画像の回転角度が更新される", async () => {
    renderViewerPage();
    const imageTransform = await screen.findByTestId(
      "viewer-image-transform-1",
    );
    expect(imageTransform.style.getPropertyValue("--rotate")).toBe("0deg");
    const rotateInput = await screen.findByRole("textbox", { name: "rotate" });
    const user = userEvent.setup();
    await user.clear(rotateInput);
    await user.type(rotateInput, "90{Enter}");
    expect(imageTransform.style.getPropertyValue("--rotate")).toBe("90deg");
  });

  // WordOverlay では zoom による描画更新のみを確認する。
  // PageScroll は既存の scrollIntoView テストでカバーできているため、ここでは確認しない。
  // --rotate は viewer-image-transform-* が img と WordOverlay をまとめて回転させるため、ViewerImage 側の確認で十分とする。
  // また、onEnter による zoom 更新経路も ViewerImage 側でカバーできているため、ここでは onClickZoomStepButton のみを対象とする。
  test("拡大ボタンを押すとOCR結果の文字サイズが更新される", async () => {
    renderViewerPage();
    const zoomUpButton = await screen.findByRole("button", { name: "拡大" });
    const wordSpan = await screen.findByRole("button", { name: "テスト語" });
    const beforeFontSize = parseFloat(wordSpan.style.fontSize);
    const user = userEvent.setup();
    await user.click(zoomUpButton);
    const afterFontSize = parseFloat(wordSpan.style.fontSize);
    expect(afterFontSize / beforeFontSize).toBeCloseTo(1.25);
  });
});
