import { vi } from "vitest";

export const setupCanvasTextMeasureMock = () => {
  return vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockImplementation(() => ({
      font: "",
      measureText: (text) => ({ width: String(text).length * 10 }),
    }));
};
