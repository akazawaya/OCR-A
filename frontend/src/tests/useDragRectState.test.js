// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

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
  test("ドラッグ完了時にbboxを生成する", () => {
    const pageId = 7;
    const onAddPendingPostByBbox = vi.fn();

    const { result } = renderHook(() =>
      useDragRectState({
        imageSizePx: { w: 100, h: 100 },
        pageId,
        onAddPendingPostByBbox,
      }),
    );

    // ドラッグ開始
    act(() => {
      result.current.onPointerDown(
        buildPointerEvent({ clientX: 10, clientY: 20 }),
      );
    });

    // ドラッグ終了
    act(() => {
      result.current.onPointerUp(
        buildPointerEvent({ clientX: 60, clientY: 70 }),
      );
    });

    // 想定: draftRectが null になり、onAddPendingPostByBbox が呼ばれてbboxが生成される
    expect(result.current.draftRect).toBeNull();
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
