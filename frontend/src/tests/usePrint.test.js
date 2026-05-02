// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { usePrint } from "../logic/print/usePrint";

const { mockUseReactToPrint } = vi.hoisted(() => ({
  mockUseReactToPrint: vi.fn(),
}));

vi.mock("react-to-print", () => ({
  useReactToPrint: mockUseReactToPrint,
}));

describe("usePrint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseReactToPrint.mockReturnValue(vi.fn());
  });

  test("onBeforePrintでprint modeに入り、Promiseが解決される", async () => {
    const contentRef = { current: document.createElement("div") };
    const { result } = renderHook(() =>
      usePrint({
        contentRef,
        pages: [{ page_number: 1, width_px: 1000, height_px: 800 }],
        currentPage: 1,
        documentTitle: "test-print",
      }),
    );
    const printOptions = mockUseReactToPrint.mock.calls[0][0];
    let beforePrintPromise;
    act(() => {
      beforePrintPromise = printOptions.onBeforePrint();
    });
    await waitFor(() => {
      expect(result.current.isPrintMode).toBe(true);
    });
    await expect(beforePrintPromise).resolves.toBeUndefined();
  });

  test("onAfterPrintでprint modeを終了する", async () => {
    const contentRef = { current: document.createElement("div") };
    const { result } = renderHook(() =>
      usePrint({
        contentRef,
        pages: [{ page_number: 1, width_px: 1000, height_px: 800 }],
        currentPage: 1,
      }),
    );
    const printOptions = mockUseReactToPrint.mock.calls[0][0];
    let beforePrintPromise;
    act(() => {
      beforePrintPromise = printOptions.onBeforePrint();
    });
    await waitFor(() => {
      expect(result.current.isPrintMode).toBe(true);
    });
    await expect(beforePrintPromise).resolves.toBeUndefined();
    act(() => {
      printOptions.onAfterPrint();
    });
    expect(result.current.isPrintMode).toBe(false);
  });

  test("onPrintErrorでprint modeを終了する", async () => {
    const contentRef = { current: document.createElement("div") };
    const { result } = renderHook(() =>
      usePrint({
        contentRef,
        pages: [{ page_number: 1, width_px: 1000, height_px: 800 }],
        currentPage: 1,
      }),
    );
    const printOptions = mockUseReactToPrint.mock.calls[0][0];
    let beforePrintPromise;
    act(() => {
      beforePrintPromise = printOptions.onBeforePrint();
    });
    await waitFor(() => {
      expect(result.current.isPrintMode).toBe(true);
    });
    await expect(beforePrintPromise).resolves.toBeUndefined();
    act(() => {
      printOptions.onPrintError();
    });
    expect(result.current.isPrintMode).toBe(false);
  });
});
