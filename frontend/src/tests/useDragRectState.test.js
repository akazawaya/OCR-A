// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { useDragRectState } from "../logic/drag/useDragRectState";

const buildPointerEvent = ({
  clientX,
  clientY,
  left = 0,
  top = 0,
  width = 100,
  height = 100,
}) => ({
  clientX,
  clientY,
  currentTarget: {
    getBoundingClientRect: () => ({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({}),
    }),
  },
});

describe("useDragRectState", () => {
  const pageId = 7;
  const onAddPendingPostByBbox = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("onPointerDownでdraftRectが初期化される", () => {
    const { result } = renderHook(() =>
      useDragRectState({
        imageSizePx: { w: 100, h: 100 },
        pageId,
        onAddPendingPostByBbox,
      }),
    );

    act(() => {
      result.current.onPointerDown(
        buildPointerEvent({ clientX: 10, clientY: 20 }),
      );
    });

    expect(result.current.draftRect).toEqual({
      x: 10,
      y: 20,
      width: 0,
      height: 0,
    });
  });

  test("onPointerMoveでdraftRectが更新される", () => {
    const { result } = renderHook(() =>
      useDragRectState({
        imageSizePx: { w: 100, h: 100 },
        pageId,
        onAddPendingPostByBbox,
      }),
    );

    act(() => {
      result.current.onPointerDown(
        buildPointerEvent({ clientX: 10, clientY: 20 }),
      );
    });

    act(() => {
      result.current.onPointerMove(
        buildPointerEvent({ clientX: 60, clientY: 70 }),
      );
    });

    expect(result.current.draftRect).toEqual({
      x: 10,
      y: 20,
      width: 50,
      height: 50,
    });
  });

  test("onPointerCancelでdraftRectがnullになる", () => {
    const { result } = renderHook(() =>
      useDragRectState({
        imageSizePx: { w: 100, h: 100 },
        pageId,
        onAddPendingPostByBbox,
      }),
    );

    act(() => {
      result.current.onPointerDown(
        buildPointerEvent({ clientX: 10, clientY: 20 }),
      );
    });

    act(() => {
      result.current.onPointerMove(
        buildPointerEvent({ clientX: 60, clientY: 70 }),
      );
    });

    act(() => {
      result.current.onPointerCancel();
    });

    expect(result.current.draftRect).toBeNull();
  });

  test("onPointerUpでdraftRectがnullになり、条件を満たすとonAddPendingPostByBboxが呼ばれる", () => {
    const { result } = renderHook(() =>
      useDragRectState({
        imageSizePx: { w: 100, h: 100 },
        pageId,
        onAddPendingPostByBbox,
      }),
    );

    act(() => {
      result.current.onPointerDown(
        buildPointerEvent({ clientX: 10, clientY: 20 }),
      );
    });

    act(() => {
      result.current.onPointerUp(
        buildPointerEvent({ clientX: 60, clientY: 70 }),
      );
    });

    expect(result.current.draftRect).toBeNull();
    expect(onAddPendingPostByBbox).toHaveBeenCalledTimes(1);
    expect(onAddPendingPostByBbox).toHaveBeenCalledWith(
      pageId,
      [
        [10, 20],
        [60, 20],
        [60, 70],
        [10, 70],
      ],
      1,
    );
  });
});
