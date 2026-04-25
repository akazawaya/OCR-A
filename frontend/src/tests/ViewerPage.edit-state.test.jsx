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

Element.prototype.scrollIntoView = vi.fn();

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

beforeEach(() => {
  vi.clearAllMocks();
  setupDefaultViewerMocks({
    mockUsePrint,
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
    expect(
      screen.getByRole("button", { name: "削除予約" }),
    ).toBeInTheDocument();
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

    const svg = document.querySelector("svg");
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
      expect(screen.getAllByRole("button", { name: "削除予約" })).toHaveLength(
        2,
      );
    });
  });

  test("内容を入力するとWordの下書き内容が更新される", async () => {
    renderViewerPage();
    const user = await enterEditMode();

    const contentInput = getContentInput();
    await user.clear(contentInput);
    await user.type(contentInput, "下書き更新");

    expect(screen.getByDisplayValue("下書き更新")).toBeInTheDocument();
  });

  test("削除予約ボタンを押すと対象Wordが削除予定状態に切り替わる", async () => {
    renderViewerPage();
    const user = await enterEditMode();

    await user.click(screen.getByRole("button", { name: "削除予約" }));

    expect(
      screen.getByRole("button", { name: "削除取消" }),
    ).toBeInTheDocument();
    expect(getContentInput()).toHaveClass("line-through");
  });
  //　Undo/Redoは削除予約の操作で確認する。
  test("Undo/Redoボタンで削除予約の切り替えを戻せる", async () => {
    renderViewerPage();
    const user = await enterEditMode();

    await user.click(screen.getByRole("button", { name: "削除予約" }));
    await user.click(screen.getByRole("button", { name: "元に戻す" }));

    expect(
      screen.getByRole("button", { name: "削除予約" }),
    ).toBeInTheDocument();
    expect(getContentInput()).not.toHaveClass("line-through");

    await user.click(screen.getByRole("button", { name: "やり直す" }));

    expect(
      screen.getByRole("button", { name: "削除取消" }),
    ).toBeInTheDocument();
    expect(getContentInput()).toHaveClass("line-through");
  });

  test("Undoコマンドで直前の編集操作が取り消される", async () => {
    renderViewerPage();
    const user = await enterEditMode();

    await user.click(screen.getByRole("button", { name: "削除予約" }));
    document.activeElement.blur();
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });

    expect(
      screen.getByRole("button", { name: "削除予約" }),
    ).toBeInTheDocument();
    expect(getContentInput()).not.toHaveClass("line-through");
  });

  test("Redoコマンドで取り消した編集操作がやり直される", async () => {
    renderViewerPage();
    const user = await enterEditMode();

    await user.click(screen.getByRole("button", { name: "削除予約" }));
    document.activeElement.blur();
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    fireEvent.keyDown(window, { key: "y", ctrlKey: true });

    expect(
      screen.getByRole("button", { name: "削除取消" }),
    ).toBeInTheDocument();
    expect(getContentInput()).toHaveClass("line-through");
  });
});
