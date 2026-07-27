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
import {
  defaultMockPages,
  dragModeMockWords,
  ocrMockByCase,
  ocrJobMock,
} from "./msw/fixture";
import {
  getMockDeletedWordIds,
  getMockPatchedWordRequests,
  getMockPostedWordBodies,
  setMockOcrJob,
  setMockWords,
} from "./msw/wordsApiHandlers";
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
const CLICK_SELECT_MODE = "クリック選択";
const DRAG_SELECT_MODE = "ドラッグ選択";
const DRAG_ADD_BBOX_MODE = "ドラッグで枠追加";

// defaultMockWords は1件のみだが、テスト対象として先頭のWordを取得する意図を明示する
const getFirstWordContentInput = () =>
  screen.getAllByDisplayValue(FIRST_WORD_CONTENT)[0];

const getViewerTable = () => screen.getByRole("table");

// AIRAのcellは<td>に連動
const getViewerTableCells = () => screen.getAllByRole("cell");

const getEditToolbar = () =>
  screen.getByRole("toolbar", { name: "編集ツールバー" });

const getEditToolbarButton = (name) =>
  within(getEditToolbar()).getByRole("button", { name });

const selectWordOnImage = async (user, content = FIRST_WORD_CONTENT) => {
  await user.click(await screen.findByRole("button", { name: content }));
};

// editMode時のみAllByDisplayValueでtdを取得可能となる点に注意
const selectWordFromTable = async (user, content = FIRST_WORD_CONTENT) => {
  const inputs = await screen.findAllByDisplayValue(content);
  await user.click(inputs[0]);
};

const switchSelectionMode = async (user, mode) => {
  await user.click(getEditToolbarButton(mode));
};

// クリック選択のshiftを兼ねた押下
// >で「押下状態を維持」　/ で「keyを離す」を組み合わせて
// Shiftを押しながらcontentをclickし、そのあとshiftを離す挙動を再現
const shiftClickWordOnImage = async (user, content) => {
  await user.keyboard("{Shift>}");
  await selectWordOnImage(user, content);
  await user.keyboard("{/Shift}");
};

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

// AREA_RECTはdragModeMockWordsのwords3種が収まるようにする。
// DRAG_SELECTIONは範囲内AとBのみ収まるようにする。
const DEFAULT_SELECTION_AREA_RECT = { width: 1000, height: 800 };
const DEFAULT_DRAG_SELECTION = {
  start: { clientX: 50, clientY: 50 },
  end: { clientX: 450, clientY: 250 },
};

const dragSelectionArea = (svg, { start, end }) => {
  fireEvent.pointerDown(svg, start);
  fireEvent.pointerMove(svg, end);
  fireEvent.pointerUp(svg, end);
};

const getPendingRectAttrs = (svg) => {
  const rects = Array.from(svg.querySelectorAll("rect"));
  const pendingRect = rects.at(-1);
  return [
    pendingRect.getAttribute("x"),
    pendingRect.getAttribute("y"),
    pendingRect.getAttribute("width"),
    pendingRect.getAttribute("height"),
  ].join(",");
};

const addPreviewWordByDrag = async (
  user,
  { rect = DEFAULT_SELECTION_AREA_RECT, drag = DEFAULT_DRAG_SELECTION } = {},
) => {
  await switchSelectionMode(user, DRAG_ADD_BBOX_MODE);
  await screen.findByRole("table");
  const cellCountBeforeDrag = getViewerTableCells().length;
  const svg = getFirstSelectionArea();
  mockSelectionAreaRect(svg, rect);
  dragSelectionArea(svg, drag);

  await waitFor(() => {
    expect(getViewerTableCells()).toHaveLength(cellCountBeforeDrag + 1);
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
      const editToolbar = getEditToolbar();
      expect(editToolbar).toBeVisible();
      expect(
        within(editToolbar).getByRole("button", { name: CLICK_SELECT_MODE }),
      ).toBeVisible();
      expect(
        within(editToolbar).getByRole("button", { name: DRAG_SELECT_MODE }),
      ).toBeVisible();
      expect(
        within(editToolbar).getByRole("button", {
          name: DRAG_ADD_BBOX_MODE,
        }),
      ).toBeVisible();
      expect(screen.getByRole("button", { name: "元に戻す" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "やり直す" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "保存" })).toBeVisible();
      expect(screen.getByRole("button", { name: "中止" })).toBeVisible();
      expect(getEditToolbarButton("削除")).toBeDisabled();
      expect(getEditToolbarButton("OCR書換")).toBeDisabled();
      expect(getEditToolbarButton("OCR置換")).toBeDisabled();
      expect(getFirstWordContentInput()).toBeVisible();
      ["削除", "OCR書換", "OCR置換"].forEach((name) => {
        expect(
          within(getViewerTable()).queryByRole("button", { name }),
        ).toBeNull();
      });
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
    test("ドラッグで枠追加のとき、仮のWordが追加される", async () => {
      renderViewerPage();
      const user = await enterEditMode();

      await addPreviewWordByDrag(user);
    });

    test("新規追加したWordは保存後に通常表示へ反映される", async () => {
      renderViewerPage();
      const user = await enterEditMode();

      await addPreviewWordByDrag(user);

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
      await waitFor(() => {
        expect(getMockPostedWordBodies()).toHaveLength(1);
      });
      expect(getMockPostedWordBodies()[0]).toEqual(
        expect.objectContaining({
          content: ADDED_WORD_CONTENT,
          det_score: null,
          rec_score: null,
        }),
      );
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

    test("手動で本文を編集したWordの検出・認識信頼度はnullとして保存される", async () => {
      setMockWords(dragModeMockWords);
      renderViewerPage();
      const user = await enterEditMode();
      const contentInput = await screen.findByDisplayValue("範囲内A");
      await user.clear(contentInput);
      await user.type(contentInput, `${UPDATED_WORD_CONTENT}{Enter}`);

      await user.click(screen.getByRole("button", { name: "保存" }));

      await waitFor(() => {
        expect(getMockPatchedWordRequests()).toHaveLength(1);
      });
      expect(getMockPatchedWordRequests()[0]).toEqual({
        id: 1,
        body: expect.objectContaining({
          content: UPDATED_WORD_CONTENT,
          det_score: null,
          rec_score: null,
        }),
      });
    });

    test("削除したWordは即時に一覧から消え、保存後の表示にも残らない", async () => {
      renderViewerPage();
      const user = await enterEditMode();

      await selectWordFromTable(user);
      expect(getEditToolbarButton("削除")).toBeEnabled();
      await user.click(getEditToolbarButton("削除"));

      expect(screen.queryByDisplayValue(FIRST_WORD_CONTENT)).toBeNull();
      expect(screen.getByRole("button", { name: "元に戻す" })).toBeEnabled();

      await user.click(screen.getByRole("button", { name: "保存" }));

      expect(screen.getByRole("button", { name: "編集" })).toBeVisible();
      expect(
        screen.queryByRole("button", { name: FIRST_WORD_CONTENT }),
      ).toBeNull();
    });

    test("複数選択時は削除だけ実行でき、選択したWordをまとめて削除できる", async () => {
      setMockWords(dragModeMockWords);
      renderViewerPage();
      const user = await enterEditMode();

      await selectWordOnImage(user, "範囲内A");
      await shiftClickWordOnImage(user, "範囲内B");

      expect(getEditToolbarButton("削除")).toBeEnabled();
      expect(getEditToolbarButton("OCR書換")).toBeDisabled();
      expect(getEditToolbarButton("OCR置換")).toBeDisabled();

      await user.click(getEditToolbarButton("削除"));

      expect(screen.queryByDisplayValue("範囲内A")).toBeNull();
      expect(screen.queryByDisplayValue("範囲内B")).toBeNull();
      expect(screen.getByDisplayValue("範囲外")).toBeVisible();

      await user.click(screen.getByRole("button", { name: "保存" }));

      await waitFor(() => {
        expect(getMockDeletedWordIds()).toHaveLength(2);
      });
      expect(getMockDeletedWordIds()).toEqual(expect.arrayContaining([1, 2]));
      expect(within(getViewerTable()).queryByText("範囲内A")).toBeNull();
      expect(within(getViewerTable()).queryByText("範囲内B")).toBeNull();
      expect(
        within(getViewerTable()).getByRole("cell", { name: "範囲外" }),
      ).toBeVisible();
    });
  });

  describe("削除操作を代表としたUndo/Redoの確認", () => {
    test("Undo/Redoボタンで削除操作を戻せる", async () => {
      renderViewerPage();
      const user = await enterEditMode();

      await selectWordOnImage(user);
      await user.click(getEditToolbarButton("削除"));
      await user.click(screen.getByRole("button", { name: "元に戻す" }));

      expect(screen.getByDisplayValue(FIRST_WORD_CONTENT)).toBeVisible();
      expect(getEditToolbarButton("削除")).toBeVisible();

      await user.click(screen.getByRole("button", { name: "やり直す" }));

      expect(screen.queryByDisplayValue(FIRST_WORD_CONTENT)).toBeNull();
    });

    test("Undoコマンドで直前の削除操作が取り消される", async () => {
      renderViewerPage();
      const user = await enterEditMode();

      await selectWordOnImage(user);
      await user.click(getEditToolbarButton("削除"));
      document.activeElement.blur();
      fireEvent.keyDown(window, { key: "z", ctrlKey: true });

      expect(screen.getByDisplayValue(FIRST_WORD_CONTENT)).toBeVisible();
    });

    test("Redoコマンドで取り消した削除操作がやり直される", async () => {
      renderViewerPage();
      const user = await enterEditMode();

      await selectWordOnImage(user);
      await user.click(getEditToolbarButton("削除"));
      document.activeElement.blur();
      fireEvent.keyDown(window, { key: "z", ctrlKey: true });
      fireEvent.keyDown(window, { key: "y", ctrlKey: true });

      expect(screen.queryByDisplayValue(FIRST_WORD_CONTENT)).toBeNull();
    });

    test("複数選択したWordの削除は1回のUndoでまとめて取り消せる", async () => {
      setMockWords(dragModeMockWords);
      renderViewerPage();
      const user = await enterEditMode();

      await selectWordOnImage(user, "範囲内A");
      await shiftClickWordOnImage(user, "範囲内B");
      await user.click(getEditToolbarButton("削除"));

      expect(screen.queryByDisplayValue("範囲内A")).toBeNull();
      expect(screen.queryByDisplayValue("範囲内B")).toBeNull();

      await user.click(screen.getByRole("button", { name: "元に戻す" }));

      expect(screen.getByDisplayValue("範囲内A")).toBeVisible();
      expect(screen.getByDisplayValue("範囲内B")).toBeVisible();
      expect(screen.getByRole("button", { name: "元に戻す" })).toBeDisabled();
    });
  });

  describe("DragRectによる詳細なpostの座標追加の確認", () => {
    test("ドラッグした通りの座標でpending bboxが積まれる", async () => {
      renderViewerPage();
      const user = await enterEditMode();
      await switchSelectionMode(user, DRAG_ADD_BBOX_MODE);
      const svg = getFirstSelectionArea();
      // SelectionAreaはfixtureのqueryRoutingMockPagesのwhが(1000,800)であることに対して1/10
      // dragSelectionAreaは(20,10)の横長となるよう配置
      // client座標は画像座標へ10倍換算されるため、(200,100)のrectとなる
      mockSelectionAreaRect(svg, { width: 100, height: 80 });
      dragSelectionArea(svg, {
        start: { clientX: 10, clientY: 10 },
        end: { clientX: 30, clientY: 20 },
      });
      await waitFor(() => {
        expect(getPendingRectAttrs(svg)).toBe("100,100,200,100");
      });
    });

    test("90度回転でも正しいpending bboxが積まれる", async () => {
      renderViewerPage();
      const user = await enterEditMode();
      await user.click(screen.getByRole("button", { name: "回転" }));
      await switchSelectionMode(user, DRAG_ADD_BBOX_MODE);

      const svg = getFirstSelectionArea();
      mockSelectionAreaRect(svg, { width: 80, height: 100 });
      dragSelectionArea(svg, {
        start: { clientX: 10, clientY: 10 },
        end: { clientX: 30, clientY: 20 },
      });
      // 90度回転時のy(左上)は imageHeight - bboxMaxX = 800 - 300 = 500
      await waitFor(() => {
        expect(getPendingRectAttrs(svg)).toBe("100,500,100,200");
      });
    });
  });

  describe("Wordの選択形式関連", () => {
    test("デフォルトのクリック選択から各ドラッグモードへ切り替えられる", async () => {
      renderViewerPage();
      const user = await enterEditMode();
      const clickSelectButton = getEditToolbarButton(CLICK_SELECT_MODE);
      const dragSelectButton = getEditToolbarButton(DRAG_SELECT_MODE);
      const dragAddBboxButton = getEditToolbarButton(DRAG_ADD_BBOX_MODE);

      expect(clickSelectButton).toHaveAttribute("aria-pressed", "true");
      expect(dragSelectButton).toHaveAttribute("aria-pressed", "false");
      expect(dragAddBboxButton).toHaveAttribute("aria-pressed", "false");

      await user.click(dragSelectButton);

      expect(clickSelectButton).toHaveAttribute("aria-pressed", "false");
      expect(dragSelectButton).toHaveAttribute("aria-pressed", "true");
      expect(dragAddBboxButton).toHaveAttribute("aria-pressed", "false");

      await user.click(dragAddBboxButton);

      expect(clickSelectButton).toHaveAttribute("aria-pressed", "false");
      expect(dragSelectButton).toHaveAttribute("aria-pressed", "false");
      expect(dragAddBboxButton).toHaveAttribute("aria-pressed", "true");
    });

    test("「クリック選択」ではドラッグは作用せず、Wordの単一クリックが機能する", async () => {
      setMockWords(dragModeMockWords);
      renderViewerPage();
      const user = await enterEditMode();
      await screen.findByRole("button", { name: "範囲内A" });
      const cellCountBeforeDrag = getViewerTableCells().length;
      const svg = getFirstSelectionArea();
      mockSelectionAreaRect(svg, DEFAULT_SELECTION_AREA_RECT);

      dragSelectionArea(svg, DEFAULT_DRAG_SELECTION);

      expect(getViewerTableCells()).toHaveLength(cellCountBeforeDrag);
      expect(getEditToolbarButton("削除")).toBeDisabled();

      await selectWordOnImage(user, "範囲内A");

      expect(getEditToolbarButton("削除")).toBeEnabled();
      expect(getEditToolbarButton("OCR書換")).toBeEnabled();
      expect(getEditToolbarButton("OCR置換")).toBeEnabled();

      await selectWordOnImage(user, "範囲内B");
      await user.click(getEditToolbarButton("削除"));

      expect(screen.getByDisplayValue("範囲内A")).toBeVisible();
      expect(screen.queryByDisplayValue("範囲内B")).toBeNull();
      expect(screen.getByDisplayValue("範囲外")).toBeVisible();
    });

    test("「クリック選択」ではShiftクリックで複数選択が可能で、選択済みWordを再度Shiftクリックすると解除できる", async () => {
      setMockWords(dragModeMockWords);
      renderViewerPage();
      const user = await enterEditMode();

      await selectWordOnImage(user, "範囲内A");
      await shiftClickWordOnImage(user, "範囲内B");

      expect(getEditToolbarButton("削除")).toBeEnabled();
      expect(getEditToolbarButton("OCR書換")).toBeDisabled();
      expect(getEditToolbarButton("OCR置換")).toBeDisabled();

      await shiftClickWordOnImage(user, "範囲内A");

      expect(getEditToolbarButton("削除")).toBeEnabled();
      expect(getEditToolbarButton("OCR書換")).toBeEnabled();
      expect(getEditToolbarButton("OCR置換")).toBeEnabled();

      await user.click(getEditToolbarButton("削除"));

      expect(screen.getByDisplayValue("範囲内A")).toBeVisible();
      expect(screen.queryByDisplayValue("範囲内B")).toBeNull();
      expect(screen.getByDisplayValue("範囲外")).toBeVisible();
    });

    test("「ドラッグ選択」では単一クリックは作用せず、範囲内のWordsだけを選択できる", async () => {
      setMockWords(dragModeMockWords);
      renderViewerPage();
      const user = await enterEditMode();
      await screen.findByText("範囲内A");
      await switchSelectionMode(user, DRAG_SELECT_MODE);

      fireEvent.click(screen.getByText("範囲内A"));
      expect(getEditToolbarButton("削除")).toBeDisabled();

      const cellCountBeforeDrag = getViewerTableCells().length;
      const svg = getFirstSelectionArea();
      mockSelectionAreaRect(svg, DEFAULT_SELECTION_AREA_RECT);
      dragSelectionArea(svg, DEFAULT_DRAG_SELECTION);

      await waitFor(() => {
        expect(getEditToolbarButton("削除")).toBeEnabled();
      });
      expect(getEditToolbarButton("OCR書換")).toBeDisabled();
      expect(getEditToolbarButton("OCR置換")).toBeDisabled();
      expect(getViewerTableCells()).toHaveLength(cellCountBeforeDrag);

      await user.click(getEditToolbarButton("削除"));

      expect(screen.queryByDisplayValue("範囲内A")).toBeNull();
      expect(screen.queryByDisplayValue("範囲内B")).toBeNull();
      expect(screen.getByDisplayValue("範囲外")).toBeVisible();
    });

    test("「ドラッグで枠追加」では単一クリックは作用せず、ドラッグで仮Wordを追加できる", async () => {
      setMockWords(dragModeMockWords);
      renderViewerPage();
      const user = await enterEditMode();
      await screen.findByRole("button", { name: "範囲内A" });
      await switchSelectionMode(user, DRAG_ADD_BBOX_MODE);
      const cellCountBeforeDrag = getViewerTableCells().length;

      fireEvent.click(screen.getByText("範囲内A"));

      expect(getViewerTableCells()).toHaveLength(cellCountBeforeDrag);
      expect(getEditToolbarButton("削除")).toBeDisabled();

      const svg = getFirstSelectionArea();
      mockSelectionAreaRect(svg, DEFAULT_SELECTION_AREA_RECT);
      dragSelectionArea(svg, DEFAULT_DRAG_SELECTION);

      await waitFor(() => {
        expect(getViewerTableCells()).toHaveLength(cellCountBeforeDrag + 1);
      });
      expect(getEditToolbarButton("削除")).toBeDisabled();
      expect(getEditToolbarButton("OCR書換")).toBeDisabled();
      expect(getEditToolbarButton("OCR置換")).toBeDisabled();
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
      await selectWordOnImage(user);
      await user.click(getEditToolbarButton("OCR書換"));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
      });
      expect(getEditToolbarButton("削除")).toBeDisabled();
      expect(getEditToolbarButton("OCR書換")).toBeDisabled();
      expect(getEditToolbarButton("OCR置換")).toBeDisabled();
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
      await selectWordOnImage(user);
      await switchSelectionMode(user, DRAG_ADD_BBOX_MODE);
      const svg = getFirstSelectionArea();
      mockSelectionAreaRect(svg, DEFAULT_SELECTION_AREA_RECT);
      const cellCountBeforeDrag = getViewerTableCells().length;
      await user.click(getEditToolbarButton("OCR書換"));

      await waitFor(() => {
        expect(getEditToolbarButton("OCR書換")).toBeDisabled();
      });

      dragSelectionArea(svg, DEFAULT_DRAG_SELECTION);
      expect(getViewerTableCells()).toHaveLength(cellCountBeforeDrag);

      wsGate.release({ state: "SUCCESS" });

      await waitFor(() => {
        expect(getEditToolbarButton("OCR書換")).toBeEnabled();
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
      await selectWordOnImage(user);
      await user.click(getEditToolbarButton("OCR書換"));

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
      expect(getEditToolbarButton("削除")).toBeVisible();
    });

    test("空白の場合もcontentのみ置換し、bboxを維持する", async () => {
      setMockOcrJob({
        previewJobId: ocrJobMock.previewJobId,
        result: ocrMockByCase.empty,
      });
      renderViewerPage();
      const user = await enterEditMode();
      await selectWordOnImage(user);
      await user.click(getEditToolbarButton("OCR書換"));
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
      expect(getEditToolbarButton("削除")).toBeVisible();
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
      await selectWordOnImage(user);
      await user.click(getEditToolbarButton("OCR置換"));

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
      await selectWordOnImage(user);
      await user.click(getEditToolbarButton("OCR置換"));

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
      await selectWordOnImage(user);
      await user.click(getEditToolbarButton("OCR置換"));

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
