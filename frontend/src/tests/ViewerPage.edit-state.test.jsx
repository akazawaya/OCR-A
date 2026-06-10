// @vitest-environment jsdom

import { beforeEach, describe, test, expect } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import {
  renderViewerPage,
  setupDefaultViewerMocks,
  setupCanvasTextMeasureMock,
} from "./ViewerPage.test-utils";
import { defaultMockPages, ocrMockByCase, ocrJobMock } from "./msw/fixture";
import { setMockOcrJob } from "./msw/wordsApiHandlers";
import { sendPreviewWordOcrChanged, createMockWsGate } from "./msw/wsHandlers";

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
});

const FIRST_WORD_CONTENT = "テスト語";
const UPDATED_WORD_CONTENT = "更新後";
const ADDED_WORD_CONTENT = "追加語";

// defaultMockWords は1件のみだが、テスト対象として先頭のWordを取得する意図を明示する
const getFirstWordContentInput = () =>
  screen.getAllByDisplayValue(FIRST_WORD_CONTENT)[0];

const getFirstWordDeleteButton = () =>
  screen.getAllByRole("button", { name: "削除" })[0];

// svgはpage単位だが、pageが識別可能な属性を付与していないため、単に先頭のsvgを取る
const getFirstSelectionArea = () =>
  screen.getAllByLabelText("文字範囲選択エリア")[0];

// jsdom では getBoundingClientRect がレイアウト計算を返せないため、
// pointer操作時に参照されても落ちないように最小限差し替える
const mockSelectionAreaRect = (
  svg,
  { left = 0, top = 0, width, height } = {},
) => {
  svg.getBoundingClientRect = () => ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  });
};

const DEFAULT_SELECTION_AREA_RECT = { width: 123, height: 456 };
const DEFAULT_DRAG_SELECTION = {
  start: { clientX: 78, clientY: 90 },
  end: { clientX: 101, clientY: 123 },
};

const dragSelectionArea = (svg, { start, end }) => {
  fireEvent.pointerDown(svg, start);
  fireEvent.pointerUp(svg, end);
};

const getPendingPolygonPoints = (svg) => {
  const polygons = Array.from(svg.querySelectorAll("polygon"));
  const pendingPolygon = polygons.at(-1);
  return pendingPolygon.getAttribute("points");
};

const addPreviewWordByDrag = async ({
  rect = DEFAULT_SELECTION_AREA_RECT,
  drag = DEFAULT_DRAG_SELECTION,
} = {}) => {
  const svg = getFirstSelectionArea();
  mockSelectionAreaRect(svg, rect);
  dragSelectionArea(svg, drag);

  // 削除ボタンの追加により配列長さが2件分となったことから、新しいWordが追加されたことを確認する
  await waitFor(() => {
    expect(screen.getAllByRole("button", { name: "削除" })).toHaveLength(2);
  });
};

describe("ViewerPage", () => {
  const enterEditMode = async () => {
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "編集" }));
    return user;
  };
  describe("編集モードと保存、中止の挙動", () => {
    test("編集ボタンを押すと編集モードへ遷移する", async () => {
      renderViewerPage();
      await enterEditMode();

      expect(screen.queryByRole("button", { name: "編集" })).toBeNull();
      expect(screen.queryByRole("button", { name: "出力" })).toBeNull();
      expect(screen.getByRole("button", { name: "元に戻す" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "やり直す" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "保存" })).toBeVisible();
      expect(screen.getByRole("button", { name: "中止" })).toBeVisible();
      expect(screen.getByRole("button", { name: "削除" })).toBeVisible();
      expect(getFirstWordContentInput()).toBeVisible();
    });

    test("保存ボタンを押すと編集内容が保存される", async () => {
      renderViewerPage();
      const user = await enterEditMode();
      const contentInput = getFirstWordContentInput();
      await user.clear(contentInput);
      await user.type(contentInput, UPDATED_WORD_CONTENT);
      await user.click(screen.getByRole("button", { name: "保存" }));

      expect(screen.getByRole("button", { name: "編集" })).toBeVisible();
      expect(
        screen.getByRole("button", { name: UPDATED_WORD_CONTENT }),
      ).toBeVisible();
      expect(screen.queryByRole("button", { name: "保存" })).toBeNull();
    });

    test("中止ボタンを押すと編集内容が破棄される", async () => {
      renderViewerPage();
      const user = await enterEditMode();
      const contentInput = getFirstWordContentInput();
      await user.clear(contentInput);
      await user.type(contentInput, UPDATED_WORD_CONTENT);
      await user.click(screen.getByRole("button", { name: "中止" }));

      expect(screen.getByRole("button", { name: "編集" })).toBeVisible();
      expect(
        screen.getByRole("button", { name: FIRST_WORD_CONTENT }),
      ).toBeVisible();
      expect(screen.queryByDisplayValue(UPDATED_WORD_CONTENT)).toBeNull();
    });
  });

  describe("保存時のPOST, PATCH, DELETE対象となるWord操作", () => {
    test("ドラッグで範囲選択すると仮のWordが追加される", async () => {
      renderViewerPage();
      await enterEditMode();

      await addPreviewWordByDrag();
    });

    test("新規追加したWordは保存後に通常表示へ反映される", async () => {
      renderViewerPage();
      const user = await enterEditMode();

      await addPreviewWordByDrag();

      const previewContentInput = screen
        .getAllByRole("textbox")
        .find((input) => input.value === "");

      expect(previewContentInput).toBeVisible();

      await user.type(previewContentInput, ADDED_WORD_CONTENT);
      await user.click(screen.getByRole("button", { name: "保存" }));

      expect(screen.getByRole("button", { name: "編集" })).toBeVisible();
      expect(
        screen.getByRole("button", { name: ADDED_WORD_CONTENT }),
      ).toBeVisible();
    });

    test("内容変更は入力中には確定されずEnterで確定される", async () => {
      renderViewerPage();
      const user = await enterEditMode();
      const contentInput = getFirstWordContentInput();
      await user.clear(contentInput);
      await user.type(contentInput, UPDATED_WORD_CONTENT);

      // アサート対象として元に戻すボタンを使う
      expect(screen.getByRole("button", { name: "元に戻す" })).toBeDisabled();

      await user.keyboard("{Enter}");

      expect(screen.getByRole("button", { name: "元に戻す" })).toBeEnabled();
    });

    test("内容変更はblurでも確定される", async () => {
      renderViewerPage();
      const user = await enterEditMode();
      const contentInput = getFirstWordContentInput();
      await user.clear(contentInput);
      await user.type(contentInput, UPDATED_WORD_CONTENT);

      expect(screen.getByRole("button", { name: "元に戻す" })).toBeDisabled();

      fireEvent.blur(contentInput);

      expect(screen.getByRole("button", { name: "元に戻す" })).toBeEnabled();
    });

    test("削除したWordは即時に一覧から消え、保存後の表示にも残らない", async () => {
      renderViewerPage();
      const user = await enterEditMode();

      await user.click(getFirstWordDeleteButton());

      expect(screen.queryByDisplayValue(FIRST_WORD_CONTENT)).toBeNull();
      expect(screen.getByRole("button", { name: "元に戻す" })).toBeEnabled();

      await user.click(screen.getByRole("button", { name: "保存" }));

      expect(screen.getByRole("button", { name: "編集" })).toBeVisible();
      expect(
        screen.queryByRole("button", { name: FIRST_WORD_CONTENT }),
      ).toBeNull();
    });
  });

  describe("削除操作を代表としたUndo/Redoの確認", () => {
    test("Undo/Redoボタンで削除操作を戻せる", async () => {
      renderViewerPage();
      const user = await enterEditMode();

      await user.click(screen.getByRole("button", { name: "削除" }));
      await user.click(screen.getByRole("button", { name: "元に戻す" }));

      expect(screen.getByDisplayValue(FIRST_WORD_CONTENT)).toBeVisible();
      expect(screen.getByRole("button", { name: "削除" })).toBeVisible();

      await user.click(screen.getByRole("button", { name: "やり直す" }));

      expect(screen.queryByDisplayValue(FIRST_WORD_CONTENT)).toBeNull();
    });

    test("Undoコマンドで直前の削除操作が取り消される", async () => {
      renderViewerPage();
      const user = await enterEditMode();

      await user.click(screen.getByRole("button", { name: "削除" }));
      document.activeElement.blur();
      fireEvent.keyDown(window, { key: "z", ctrlKey: true });

      expect(screen.getByDisplayValue(FIRST_WORD_CONTENT)).toBeVisible();
    });

    test("Redoコマンドで取り消した削除操作がやり直される", async () => {
      renderViewerPage();
      const user = await enterEditMode();

      await user.click(screen.getByRole("button", { name: "削除" }));
      document.activeElement.blur();
      fireEvent.keyDown(window, { key: "z", ctrlKey: true });
      fireEvent.keyDown(window, { key: "y", ctrlKey: true });

      expect(screen.queryByDisplayValue(FIRST_WORD_CONTENT)).toBeNull();
    });
  });

  describe("DragRectによる詳細なpostの座標追加の確認", () => {
    test("ドラッグした通りの座標でpending bboxが積まれる", async () => {
      renderViewerPage();
      await enterEditMode();
      const svg = getFirstSelectionArea();
      // SelectionAreaはfixtureのqueryRoutingMockPagesのwhが(1000,800)であることに対して1/10
      // dragSelectionAreaは(20,10)の横長となるよう配置
      // client座標は画像座標へ10倍換算されるため、(200,100)のrectとなる
      mockSelectionAreaRect(svg, { width: 100, height: 80 });
      dragSelectionArea(svg, {
        start: { clientX: 10, clientY: 10 },
        end: { clientX: 30, clientY: 20 },
      });
      // polygonのpointsは左上を(0,0)とした、左上からの時計回り
      await waitFor(() => {
        expect(getPendingPolygonPoints(svg)).toBe(
          "100,100 300,100 300,200 100,200",
        );
      });
    });

    test("90度回転でも正しいpending bboxが積まれる", async () => {
      renderViewerPage();
      const user = await enterEditMode();
      await user.click(screen.getByRole("button", { name: "回転" }));

      const svg = getFirstSelectionArea();
      mockSelectionAreaRect(svg, { width: 80, height: 100 });
      dragSelectionArea(svg, {
        start: { clientX: 10, clientY: 10 },
        end: { clientX: 30, clientY: 20 },
      });
      // 90度回転時のy1は imageHeight - bboxMaxX = 800 - 300 = 500
      await waitFor(() => {
        expect(getPendingPolygonPoints(svg)).toBe(
          "100,500 200,500 200,700 100,700",
        );
      });
    });
  });

  describe("previewWordのocr:ws待ちの挙動", () => {
    test("ws待ちの間はtableとTopBarの操作がdisabledになる", async () => {
      setMockOcrJob({
        previewJobId: ocrJobMock.previewJobId,
      });
      const wsGate = createMockWsGate({
        previewJobId: ocrJobMock.previewJobId,
      });
      renderViewerPage();
      const user = await enterEditMode();
      await user.click(screen.getByRole("button", { name: "OCR書換" }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
      });
      expect(screen.getByRole("button", { name: "削除" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "OCR書換" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "OCR置換" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "回転" })).toBeDisabled();
      expect(screen.getByLabelText("page")).toBeDisabled();
      expect(screen.getByLabelText("zoom")).toBeDisabled();
      expect(screen.getByLabelText("rotate")).toBeDisabled();
      expect(screen.getByRole("status")).toHaveTextContent("OCR実行中...");

      wsGate.release({ state: "SUCCESS" });

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "保存" })).toBeEnabled();
      });
      expect(screen.queryByRole("status")).toBeNull();
    });

    test("ws待ちの間はDragRectが機能しない", async () => {
      setMockOcrJob({
        previewJobId: ocrJobMock.previewJobId,
      });
      const wsGate = createMockWsGate({
        previewJobId: ocrJobMock.previewJobId,
      });
      renderViewerPage();
      const user = await enterEditMode();
      const svg = getFirstSelectionArea();
      mockSelectionAreaRect(svg, DEFAULT_SELECTION_AREA_RECT);
      await user.click(screen.getByRole("button", { name: "OCR書換" }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "OCR書換" })).toBeDisabled();
      });

      dragSelectionArea(svg, DEFAULT_DRAG_SELECTION);
      expect(screen.getAllByRole("button", { name: "削除" })).toHaveLength(1);

      wsGate.release({ state: "SUCCESS" });

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "OCR書換" })).toBeEnabled();
      });
    });
  });

  describe("previewWordのocr: rewrite_contentの書換", () => {
    test("複数のwordもひとつのcontentとして置換する", async () => {
      setMockOcrJob({
        previewJobId: ocrJobMock.previewJobId,
        result: ocrMockByCase.splitWords,
      });
      renderViewerPage();
      const user = await enterEditMode();
      await user.click(screen.getByRole("button", { name: "OCR書換" }));

      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveTextContent("OCR実行中...");
      });

      sendPreviewWordOcrChanged({
        previewJobId: ocrJobMock.previewJobId,
        state: "SUCCESS",
      });
      await waitFor(() => {
        expect(screen.getByDisplayValue("分割A分割B")).toBeVisible();
      });
      expect(screen.getByRole("button", { name: "削除" })).toBeVisible();
    });

    test("空白の場合もcontentのみ置換し、bboxを維持する", async () => {
      setMockOcrJob({
        previewJobId: ocrJobMock.previewJobId,
        result: ocrMockByCase.empty,
      });
      renderViewerPage();
      const user = await enterEditMode();
      await user.click(screen.getByRole("button", { name: "OCR書換" }));
      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveTextContent("OCR実行中...");
      });

      sendPreviewWordOcrChanged({
        previewJobId: ocrJobMock.previewJobId,
        state: "SUCCESS",
      });

      await waitFor(() => {
        const emptyInputs = screen
          .queryAllByRole("textbox")
          .filter((input) => input.value === "");
        expect(emptyInputs).toHaveLength(1);
      });
      expect(screen.getByRole("button", { name: "削除" })).toBeVisible();
    });
  });

  describe("previewWordのocr: replace_wordsの置換", () => {
    test("複数のwordは分裂して置換する", async () => {
      setMockOcrJob({
        previewJobId: ocrJobMock.previewJobId,
        result: ocrMockByCase.splitWords,
      });
      renderViewerPage();
      const user = await enterEditMode();
      await user.click(screen.getByRole("button", { name: "OCR置換" }));

      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveTextContent("OCR実行中...");
      });

      sendPreviewWordOcrChanged({
        previewJobId: ocrJobMock.previewJobId,
        state: "SUCCESS",
      });

      await waitFor(() => {
        expect(screen.getByDisplayValue("分割A")).toBeVisible();
        expect(screen.getByDisplayValue("分割B")).toBeVisible();
      });
      expect(screen.queryByDisplayValue(FIRST_WORD_CONTENT)).toBeNull();
    });

    test("空白の場合は元のbboxも削除する", async () => {
      setMockOcrJob({
        previewJobId: ocrJobMock.previewJobId,
        result: ocrMockByCase.empty,
      });
      renderViewerPage();
      const user = await enterEditMode();
      await user.click(screen.getByRole("button", { name: "OCR置換" }));

      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveTextContent("OCR実行中...");
      });

      sendPreviewWordOcrChanged({
        previewJobId: ocrJobMock.previewJobId,
        state: "SUCCESS",
      });

      await waitFor(() => {
        expect(screen.queryByDisplayValue(FIRST_WORD_CONTENT)).toBeNull();
        const table = screen.getByRole("table");
        const wordTextboxes = within(table).queryAllByRole("textbox");
        expect(wordTextboxes).toHaveLength(0);
      });
    });

    test("複数の置換時はひと塊でUndo/Redoが機能する", async () => {
      setMockOcrJob({
        previewJobId: ocrJobMock.previewJobId,
        result: ocrMockByCase.splitWords,
      });
      renderViewerPage();
      const user = await enterEditMode();
      await user.click(screen.getByRole("button", { name: "OCR置換" }));

      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveTextContent("OCR実行中...");
      });

      sendPreviewWordOcrChanged({
        previewJobId: ocrJobMock.previewJobId,
        state: "SUCCESS",
      });

      await waitFor(() => {
        expect(screen.getByDisplayValue("分割A")).toBeVisible();
        expect(screen.getByDisplayValue("分割B")).toBeVisible();
      });

      await user.click(screen.getByRole("button", { name: "元に戻す" }));
      await waitFor(() => {
        expect(screen.getByDisplayValue(FIRST_WORD_CONTENT)).toBeVisible();
        expect(screen.queryByDisplayValue("分割A")).toBeNull();
        expect(screen.queryByDisplayValue("分割B")).toBeNull();
      });

      await user.click(screen.getByRole("button", { name: "やり直す" }));
      await waitFor(() => {
        expect(screen.getByDisplayValue("分割A")).toBeVisible();
        expect(screen.getByDisplayValue("分割B")).toBeVisible();
        expect(screen.queryByDisplayValue(FIRST_WORD_CONTENT)).toBeNull();
      });
    });
  });
});
