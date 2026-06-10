import { ws } from "msw";

const documentWsMock = ws.link("ws://test.dummy/ocr/");

export const wsHandlers = [
  documentWsMock.addEventListener("connection", () => {}),
];
