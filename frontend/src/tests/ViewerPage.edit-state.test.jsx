// @vitest-environment jsdom

import { beforeEach, describe, test, expect } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import {
  renderViewerPage,
  setupDefaultViewerMocks,
} from "./ViewerPage.test-utils";

beforeEach(() => {
  setupDefaultViewerMocks();
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
  { left = 0, top = 0, width = 200, height = 100 } = {},
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

const dragSelectionArea = (
  svg,
  {
    start = { clientX: 10, clientY: 20 },
    end = { clientX: 110, clientY: 120 },
  } = {},
) => {
  fireEvent.pointerDown(svg, start);
  fireEvent.pointerUp(svg, end);
};

const getPendingPolygonPoints = (svg) => {
  const polygons = Array.from(svg.querySelectorAll("polygon"));
  const pendingPolygon = polygons.find((polygon) =>
    (polygon.getAttribute("class") ?? "").includes("fill-green-500/15"),
  );
  return pendingPolygon?.getAttribute("points") ?? null;
};

const addPreviewWordByDrag = async () => {
  const svg = getFirstSelectionArea();
  mockSelectionAreaRect(svg);
  dragSelectionArea(svg);

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
      expect(screen.getByText(UPDATED_WORD_CONTENT)).toBeVisible();
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
      expect(screen.getByText(FIRST_WORD_CONTENT)).toBeVisible();
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
      expect(screen.getByText(ADDED_WORD_CONTENT)).toBeVisible();
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
      expect(screen.queryByText(FIRST_WORD_CONTENT)).toBeNull();
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

  describe("Dragによる詳細なpostの座標追加の確認", () => {
    test("ドラッグした通りの座標でpending bboxが積まれる", async () => {
      renderViewerPage();
      await enterEditMode();

      const svg = getFirstSelectionArea();
      mockSelectionAreaRect(svg, { width: 200, height: 100 });
      dragSelectionArea(svg, {
        start: { clientX: 20, clientY: 10 },
        end: { clientX: 120, clientY: 60 },
      });

      await waitFor(() => {
        expect(getPendingPolygonPoints(svg)).toBe(
          "100,80 600,80 600,480 100,480",
        );
      });
    });

    test("90度回転でも正しいpending bboxが積まれる", async () => {
      renderViewerPage();
      const user = await enterEditMode();
      await user.click(screen.getByRole("button", { name: "回転" }));

      const svg = getFirstSelectionArea();
      mockSelectionAreaRect(svg, { width: 100, height: 200 });
      dragSelectionArea(svg, {
        start: { clientX: 10, clientY: 20 },
        end: { clientX: 60, clientY: 120 },
      });
      await waitFor(() => {
        expect(getPendingPolygonPoints(svg)).toBe(
          "100,320 600,320 600,720 100,720",
        );
      });
    });
  });
});
