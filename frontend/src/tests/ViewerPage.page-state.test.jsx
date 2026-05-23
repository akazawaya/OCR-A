// @vitest-environment jsdom

import { beforeEach, describe, test, expect, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import {
  VIEWER_ZOOM,
  VIEWER_ROTATE_STEP,
} from "../logic/viewer/viewerPageConstants";

import { defaultMockPages } from "./msw/fixture";
import {
  mockUsePrint,
  renderViewerPage,
  setupDefaultViewerMocks,
  setupCanvasTextMeasureMock,
} from "./ViewerPage.test-utils";

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
  setupDefaultViewerMocks();
  setupCanvasTextMeasureMock();
  Element.prototype.scrollIntoView = vi.fn();
});

// Pageのfixtureに対して最後のページ番号の取得を抽象化
const getLastMockPageNumber = () =>
  Math.max(...defaultMockPages.map((page) => page.page_number));

describe("ViewerPage", () => {
  test("次ページボタンを押すと対象ページへスクロールする", async () => {
    renderViewerPage();
    const nextButton = screen.getByRole("button", {
      name: "次のページ",
    });
    const user = userEvent.setup();
    await user.click(nextButton);

    await waitFor(() => {
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });
    const page2 = await screen.findByRole("group", {
      name: "画像表示エリア 2ページ目",
    });

    expect(page2).toBeVisible();
  });

  test("拡大・縮小ボタンを押すと画像サイズが更新される", async () => {
    renderViewerPage();
    const page = defaultMockPages[0];
    const zoomedWidth = page.width_px * (1 + VIEWER_ZOOM.STEP / 100);
    const zoomedHeight = page.height_px * (1 + VIEWER_ZOOM.STEP / 100);
    const zoomUpButton = screen.getByRole("button", { name: "拡大" });
    const zoomDownButton = screen.getByRole("button", { name: "縮小" });

    const imageTransform = await screen.findByRole("group", {
      name: `画像表示エリア ${page.page_number}ページ目`,
    });

    expect(imageTransform.style.width).toBe(`${page.width_px}px`);
    expect(imageTransform.style.height).toBe(`${page.height_px}px`);

    const user = userEvent.setup();
    await user.click(zoomUpButton);

    expect(imageTransform.style.width).toBe(`${zoomedWidth}px`);
    expect(imageTransform.style.height).toBe(`${zoomedHeight}px`);

    await user.click(zoomDownButton);

    expect(imageTransform.style.width).toBe(`${page.width_px}px`);
    expect(imageTransform.style.height).toBe(`${page.height_px}px`);
  });

  test("回転ボタンを押すと画像の回転角度が更新される", async () => {
    renderViewerPage();
    const page = defaultMockPages[0];
    const rotateButton = screen.getByRole("button", { name: "回転" });
    const imageTransform = await screen.findByRole("group", {
      name: `画像表示エリア ${page.page_number}ページ目`,
    });

    expect(imageTransform.style.getPropertyValue("--rotate")).toBe("0deg");

    const user = userEvent.setup();
    await user.click(rotateButton);

    expect(imageTransform.style.getPropertyValue("--rotate")).toBe(
      `${VIEWER_ROTATE_STEP}deg`,
    );
  });

  test("ページ番号を入力してEnterを押すと対象ページへスクロールする", async () => {
    renderViewerPage();
    await screen.findByRole("group", {
      name: "画像表示エリア 2ページ目",
    });
    const pageInput = screen.getByRole("textbox", { name: "page" });
    const user = userEvent.setup();

    await user.clear(pageInput);
    await user.type(pageInput, "2{Enter}");

    await waitFor(() => {
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });
  });

  test("倍率を入力してEnterを押すと画像サイズが更新される", async () => {
    renderViewerPage();
    const page = defaultMockPages[0];
    const zoomedWidth = page.width_px * (1 + VIEWER_ZOOM.STEP / 100);
    const zoomedHeight = page.height_px * (1 + VIEWER_ZOOM.STEP / 100);

    const imageTransform = await screen.findByRole("group", {
      name: `画像表示エリア ${page.page_number}ページ目`,
    });

    expect(imageTransform.style.width).toBe(`${page.width_px}px`);
    expect(imageTransform.style.height).toBe(`${page.height_px}px`);

    const zoomInput = screen.getByRole("textbox", { name: "zoom" });
    const user = userEvent.setup();
    await user.clear(zoomInput);
    await user.type(zoomInput, "125{Enter}");

    expect(imageTransform.style.width).toBe(`${zoomedWidth}px`);
    expect(imageTransform.style.height).toBe(`${zoomedHeight}px`);
  });

  test("回転角度を入力してEnterを押すと画像の回転角度が更新される", async () => {
    renderViewerPage();
    const page = defaultMockPages[0];
    const imageTransform = await screen.findByRole("group", {
      name: `画像表示エリア ${page.page_number}ページ目`,
    });

    expect(imageTransform.style.getPropertyValue("--rotate")).toBe("0deg");

    const rotateInput = screen.getByRole("textbox", { name: "rotate" });
    const user = userEvent.setup();
    await user.clear(rotateInput);
    await user.type(rotateInput, "90{Enter}");

    expect(imageTransform.style.getPropertyValue("--rotate")).toBe("90deg");
  });

  test("ページ番号を入力してblurすると対象ページへスクロールする", async () => {
    renderViewerPage();

    await screen.findByRole("group", {
      name: "画像表示エリア 2ページ目",
    });
    const pageInput = screen.getByRole("textbox", { name: "page" });
    const user = userEvent.setup();
    await user.clear(pageInput);
    await user.type(pageInput, "2");
    fireEvent.blur(pageInput);

    await waitFor(() => {
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });
  });

  // WordOverlay では zoom による描画更新のみを確認する。
  // PageScroll は既存の scrollIntoView テストでカバーできているため、ここでは確認しない。
  // --rotate は viewer-image-transform-* が img と WordOverlay をまとめて回転させるため、ViewerImage 側の確認で十分とする。
  // また、onEnter による zoom 更新経路も ViewerImage 側でカバーできているため、ここでは onClickZoomStepButton のみを対象とする。
  test("拡大ボタンを押すとOCR結果の文字サイズが更新される", async () => {
    renderViewerPage();
    const zoomUpButton = screen.getByRole("button", { name: "拡大" });
    const wordSpan = await screen.findByRole("button", { name: "テスト語" });
    const beforeFontSize = parseFloat(wordSpan.style.fontSize);
    const user = userEvent.setup();
    await user.click(zoomUpButton);
    const afterFontSize = parseFloat(wordSpan.style.fontSize);
    // サイズ変更は単に大きくなったか否かをアサートする
    expect(afterFontSize).toBeGreaterThan(beforeFontSize);
  });

  test("内容をEnterで確定するとWordOverlayの表示語も更新される", async () => {
    renderViewerPage();
    const user = userEvent.setup();
    const editButton = screen.getByRole("button", { name: "編集" });
    await user.click(editButton);
    const contentInput = screen.getByDisplayValue("テスト語");
    await user.clear(contentInput);
    await user.type(contentInput, "更新後{Enter}");

    expect(screen.getByRole("button", { name: "更新後" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "テスト語" })).toBeNull();
  });

  test("ページ移動と拡大縮小は限界に応じてdisabled/enabledになる", async () => {
    renderViewerPage();
    const user = userEvent.setup();
    const prevButton = screen.getByRole("button", {
      name: "前のページ",
    });
    const nextButton = screen.getByRole("button", {
      name: "次のページ",
    });
    const zoomDownButton = screen.getByRole("button", { name: "縮小" });
    const zoomUpButton = screen.getByRole("button", { name: "拡大" });
    const zoomInput = screen.getByRole("textbox", { name: "zoom" });
    const pageInput = screen.getByRole("textbox", { name: "page" });

    await waitFor(() => {
      expect(prevButton).toBeDisabled();
      expect(nextButton).toBeEnabled();
    });
    const lastPageNumber = getLastMockPageNumber();
    await user.clear(pageInput);
    await user.type(pageInput, `${lastPageNumber}{Enter}`);
    await waitFor(() => {
      expect(prevButton).toBeEnabled();
      expect(nextButton).toBeDisabled();
    });

    await user.clear(zoomInput);
    await user.type(zoomInput, `${VIEWER_ZOOM.MIN}{Enter}`);
    await waitFor(() => {
      expect(zoomDownButton).toBeDisabled();
      expect(zoomUpButton).toBeEnabled();
    });
    await user.clear(zoomInput);
    await user.type(zoomInput, `${VIEWER_ZOOM.MAX}{Enter}`);
    await waitFor(() => {
      expect(zoomDownButton).toBeEnabled();
      expect(zoomUpButton).toBeDisabled();
    });
  });

  test("編集時は出力ボタンが表示されない", async () => {
    renderViewerPage();
    const user = userEvent.setup();
    const editButton = screen.getByRole("button", { name: "編集" });
    await user.click(editButton);

    expect(screen.queryByRole("button", { name: "出力" })).toBeNull();
  });

  test("非編集時は出力ボタンを押すとopenPrintDialogが呼ばれる", async () => {
    const mockOpenPrintDialog = vi.fn();
    mockUsePrint.mockReturnValue({
      openPrintDialog: mockOpenPrintDialog,
    });
    renderViewerPage();
    const user = userEvent.setup();
    const printButton = screen.getByRole("button", { name: "出力" });
    await user.click(printButton);

    expect(mockOpenPrintDialog).toHaveBeenCalledTimes(1);
  });
});
