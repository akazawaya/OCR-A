// @vitest-environment jsdom

import { beforeEach, describe, test, expect, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import {
  defaultMockWords,
  renderViewerPage,
  setupDefaultViewerMocks,
  setupResizeObserverMock,
} from "./ViewerPage.test-utils";

const {
  mockGetCollection,
  mockPostCollectionItem,
  mockDeleteCollectionItem,
  mockPatchCollectionItem,
} = vi.hoisted(() => ({
  mockGetCollection: vi.fn(),
  mockPostCollectionItem: vi.fn(),
  mockDeleteCollectionItem: vi.fn(),
  mockPatchCollectionItem: vi.fn(),
}));

Element.prototype.scrollIntoView = vi.fn();

vi.mock("../api/clients/collectionClient", () => ({
  getCollection: mockGetCollection,
}));

vi.mock("../api/clients/mutationClient", () => ({
  postCollectionItem: mockPostCollectionItem,
  deleteCollectionItem: mockDeleteCollectionItem,
  patchCollectionItem: mockPatchCollectionItem,
}));

setupResizeObserverMock();

beforeEach(() => {
  vi.clearAllMocks();
  setupDefaultViewerMocks({
    mockGetCollection,
    words: defaultMockWords,
  });
  mockPostCollectionItem.mockResolvedValue({});
  mockDeleteCollectionItem.mockResolvedValue({});
  mockPatchCollectionItem.mockResolvedValue({});
});

describe("ViewerPage", () => {
  const enterEditMode = async () => {
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "編集" }));
    return user;
  };

  const getContentInput = () => screen.getByDisplayValue("テスト語");

  test("編集ボタンを押すと編集モードへ遷移する", async () => {
    renderViewerPage();

    await enterEditMode();

    expect(screen.queryByRole("button", { name: "編集" })).toBeNull();
    expect(screen.queryByRole("button", { name: "出力" })).toBeNull();
    expect(screen.getByRole("button", { name: "元に戻す" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "やり直す" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "中止" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "削除" })).toBeInTheDocument();
    expect(getContentInput()).toBeInTheDocument();
  });

  test("保存ボタンを押すと編集内容が保存される", async () => {
    renderViewerPage();
    const user = await enterEditMode();

    const contentInput = getContentInput();
    await user.clear(contentInput);
    await user.type(contentInput, "更新後");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await (() => {
      expect(mockPatchCollectionItem).toHaveBeenCalledWith({
        collectionUrl: "/words/",
        id: "1",
        body: { content: "更新後" },
      });
    });
    expect(screen.getByRole("button", { name: "編集" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "保存" })).toBeNull();
  });

  test("中止ボタンを押すと編集内容が破棄される", async () => {
    renderViewerPage();
    const user = await enterEditMode();

    const contentInput = getContentInput();
    await user.clear(contentInput);
    await user.type(contentInput, "更新後");
    await user.click(screen.getByRole("button", { name: "中止" }));

    expect(mockPatchCollectionItem).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "編集" })).toBeInTheDocument();
    expect(screen.getAllByText("テスト語").length).toBeGreaterThan(0);
    expect(screen.queryByDisplayValue("更新後")).toBeNull();
  });

  test("ドラッグで範囲選択すると仮のWordが追加される", async () => {
    renderViewerPage();

    await enterEditMode();

    const imageTransform = await screen.findByTestId(
      "viewer-image-transform-1",
    );
    const svg = imageTransform.querySelector("svg");
    expect(svg).not.toBeNull();
    // jsdom には実ブラウザのようなレイアウト計算がないため、
    // ドラッグ時の座標変換に使う getBoundingClientRect を固定する
    svg.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 1000,
      height: 800,
      right: 1000,
      bottom: 800,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.pointerDown(svg, { clientX: 10, clientY: 20 });
    fireEvent.pointerMove(svg, { clientX: 110, clientY: 120 });
    fireEvent.pointerUp(svg, { clientX: 110, clientY: 120 });

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "削除" })).toHaveLength(2);
    });
  });

  test("新規追加したWordの内容は保存時にpostへ含まれる", async () => {
    renderViewerPage();
    const user = await enterEditMode();

    const imageTransform = await screen.findByTestId(
      "viewer-image-transform-1",
    );
    const svg = imageTransform.querySelector("svg");
    expect(svg).not.toBeNull();
    svg.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 1000,
      height: 800,
      right: 1000,
      bottom: 800,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.pointerDown(svg, { clientX: 10, clientY: 20 });
    fireEvent.pointerMove(svg, { clientX: 110, clientY: 120 });
    fireEvent.pointerUp(svg, { clientX: 110, clientY: 120 });

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "削除" })).toHaveLength(2);
    });

    const previewContentInput = screen
      .getAllByRole("textbox")
      .find((input) => input.value === "");
    expect(previewContentInput).toBeDefined();
    await user.type(previewContentInput, "追加語");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() =>
      expect(mockPostCollectionItem).toHaveBeenCalledTimes(1),
    );
    expect(mockPostCollectionItem).toHaveBeenCalledWith({
      collectionUrl: expect.stringContaining("/words/"),
      body: {
        page: 1,
        bbox: expect.any(Array),
        direction: expect.any(Number),
        content: "追加語",
      },
    });
  });

  test("内容を入力するとinputの表示が更新される", async () => {
    renderViewerPage();
    const user = await enterEditMode();

    const contentInput = getContentInput();
    await user.clear(contentInput);
    await user.type(contentInput, "下書き更新");

    expect(screen.getByDisplayValue("下書き更新")).toBeInTheDocument();
  });

  test("内容変更はEnterで確定するまでUndo履歴に積まれない", async () => {
    renderViewerPage();
    const user = await enterEditMode();

    const contentInput = getContentInput();
    await user.clear(contentInput);
    await user.type(contentInput, "更新後");

    expect(screen.getByRole("button", { name: "元に戻す" })).toBeDisabled();

    await user.keyboard("{Enter}");

    expect(screen.getByRole("button", { name: "元に戻す" })).toBeEnabled();
  });

  test("内容変更はblurでも確定される", async () => {
    renderViewerPage();
    const user = await enterEditMode();

    const contentInput = getContentInput();
    await user.clear(contentInput);
    await user.type(contentInput, "更新後");

    expect(screen.getByRole("button", { name: "元に戻す" })).toBeDisabled();

    fireEvent.blur(contentInput);

    expect(screen.getByRole("button", { name: "元に戻す" })).toBeEnabled();
  });

  test("Enterで確定した内容変更はUndoで全文が戻る", async () => {
    renderViewerPage();
    const user = await enterEditMode();

    const contentInput = getContentInput();
    await user.clear(contentInput);
    await user.type(contentInput, "更新後");
    await user.keyboard("{Enter}");

    document.activeElement.blur();
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });

    expect(screen.getByDisplayValue("テスト語")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("更新後")).toBeNull();
  });

  test("削除ボタンを押すと対象Wordが即時に一覧から消える", async () => {
    renderViewerPage();
    const user = await enterEditMode();

    await user.click(screen.getByRole("button", { name: "削除" }));

    expect(screen.queryByDisplayValue("テスト語")).toBeNull();
    expect(screen.getByRole("button", { name: "元に戻す" })).toBeEnabled();
  });

  test("削除したWordは保存時にdeleteへ含まれる", async () => {
    renderViewerPage();
    const user = await enterEditMode();

    await user.click(screen.getByRole("button", { name: "削除" }));
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() =>
      expect(mockDeleteCollectionItem).toHaveBeenCalledWith({
        collectionUrl: expect.stringContaining("/words/"),
        id: 1,
      }),
    );
  });

  test("中止ボタンで削除操作も破棄される", async () => {
    renderViewerPage();
    const user = await enterEditMode();

    await user.click(screen.getByRole("button", { name: "削除" }));
    expect(screen.queryByDisplayValue("テスト語")).toBeNull();

    await user.click(screen.getByRole("button", { name: "中止" }));

    expect(screen.getByRole("button", { name: "編集" })).toBeInTheDocument();
    expect(screen.getAllByText("テスト語").length).toBeGreaterThan(0);
    expect(mockDeleteCollectionItem).not.toHaveBeenCalled();
  });

  // Undo/Redoは削除操作で確認する。
  test("Undo/Redoボタンで削除操作を戻せる", async () => {
    renderViewerPage();
    const user = await enterEditMode();

    await user.click(screen.getByRole("button", { name: "削除" }));
    await user.click(screen.getByRole("button", { name: "元に戻す" }));

    expect(screen.getByDisplayValue("テスト語")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "削除" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "やり直す" }));

    expect(screen.queryByDisplayValue("テスト語")).toBeNull();
  });

  test("Undoコマンドで直前の編集操作が取り消される", async () => {
    renderViewerPage();
    const user = await enterEditMode();

    await user.click(screen.getByRole("button", { name: "削除" }));
    document.activeElement.blur();
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });

    expect(screen.getByDisplayValue("テスト語")).toBeInTheDocument();
  });

  test("Redoコマンドで取り消した編集操作がやり直される", async () => {
    renderViewerPage();
    const user = await enterEditMode();

    await user.click(screen.getByRole("button", { name: "削除" }));
    document.activeElement.blur();
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    fireEvent.keyDown(window, { key: "y", ctrlKey: true });

    expect(screen.queryByDisplayValue("テスト語")).toBeNull();
  });
});
