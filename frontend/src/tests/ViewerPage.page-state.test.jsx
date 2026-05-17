// @vitest-environment jsdom

import { beforeEach, describe, test, expect, vi, afterEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import { defaultMockPages } from "./msw/fixture";
import {
  renderViewerPage,
  setupDefaultViewerMocks,
  setupResizeObserverMock,
} from "./ViewerPage.test-utils";
import { setupCanvasTextMeasureMock } from "./mockCanvasTextMeasure";

const { mockUsePrint, mockOpenPrintDialog } = vi.hoisted(() => ({
  mockUsePrint: vi.fn(),
  mockOpenPrintDialog: vi.fn(),
}));

Element.prototype.scrollIntoView = vi.fn();

vi.mock("../logic/print/usePrint", () => ({
  usePrint: mockUsePrint,
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

let getContextSpy;

beforeEach(() => {
  setupDefaultViewerMocks({
    mockUsePrint,
    mockOpenPrintDialog,
  });
  getContextSpy = setupCanvasTextMeasureMock();
});

afterEach(() => {
  getContextSpy?.mockRestore();
});

describe("ViewerPage", () => {
  test("次ページボタンを押すと対象ページへスクロールする", async () => {
    renderViewerPage();
    const nextButton = await screen.findByRole("button", {
      name: "次のページ",
    });
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
    const imageTransform = await screen.findByRole("group", {
      name: "画像表示エリア 1ページ目",
    });
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
    const imageTransform = await screen.findByRole("group", {
      name: "画像表示エリア 1ページ目",
    });
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
    const imageTransform = await screen.findByRole("group", {
      name: "画像表示エリア 1ページ目",
    });
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
    const imageTransform = await screen.findByRole("group", {
      name: "画像表示エリア 1ページ目",
    });
    expect(imageTransform.style.getPropertyValue("--rotate")).toBe("0deg");
    const rotateInput = await screen.findByRole("textbox", { name: "rotate" });
    const user = userEvent.setup();
    await user.clear(rotateInput);
    await user.type(rotateInput, "90{Enter}");
    expect(imageTransform.style.getPropertyValue("--rotate")).toBe("90deg");
  });

  test("ページ番号を入力してblurすると対象ページへスクロールする", async () => {
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
    await user.type(pageInput, "2");
    fireEvent.blur(pageInput);
    await waitFor(() => expect(mockScrollIntoView).toHaveBeenCalled());
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

  test("内容をEnterで確定するとWordOverlayの表示語も更新される", async () => {
    renderViewerPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "編集" }));
    const contentInput = screen.getByDisplayValue("テスト語");
    await user.clear(contentInput);
    await user.type(contentInput, "更新後");
    await user.keyboard("{Enter}");

    expect(screen.getByRole("button", { name: "更新後" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "テスト語" })).toBeNull();
  });

  test("ページ移動と拡大縮小ボタンは境界でdisabledになる", async () => {
    renderViewerPage();
    const user = userEvent.setup();

    const prevButton = await screen.findByRole("button", {
      name: "前のページ",
    });
    const nextButton = await screen.findByRole("button", {
      name: "次のページ",
    });
    const zoomDownButton = await screen.findByRole("button", { name: "縮小" });
    const zoomUpButton = await screen.findByRole("button", { name: "拡大" });

    expect(prevButton).toBeDisabled();
    expect(nextButton).toBeEnabled();
    expect(zoomDownButton).toBeEnabled();
    expect(zoomUpButton).toBeEnabled();

    await user.click(nextButton);
    expect(prevButton).toBeEnabled();
    expect(nextButton).toBeDisabled();

    await user.click(zoomDownButton);
    await user.click(zoomDownButton);
    await user.click(zoomDownButton);
    expect(zoomDownButton).toBeDisabled();
    expect(zoomUpButton).toBeEnabled();

    await user.click(zoomUpButton);
    await user.click(zoomUpButton);
    await user.click(zoomUpButton);
    await user.click(zoomUpButton);
    await user.click(zoomUpButton);
    await user.click(zoomUpButton);
    await user.click(zoomUpButton);
    await user.click(zoomUpButton);
    await user.click(zoomUpButton);
    await user.click(zoomUpButton);
    await user.click(zoomUpButton);
    expect(zoomUpButton).toBeDisabled();
  });

  test("編集時は出力ボタンが表示されない", async () => {
    renderViewerPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "編集" }));
    expect(screen.queryByRole("button", { name: "出力" })).toBeNull();
  });

  test("非編集時は出力ボタンを押すとopenPrintDialogが呼ばれる", async () => {
    renderViewerPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "出力" }));
    expect(mockOpenPrintDialog).toHaveBeenCalledTimes(1);
  });
});
