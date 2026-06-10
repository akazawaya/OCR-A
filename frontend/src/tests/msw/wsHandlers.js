import { ws } from "msw";

export const ocrWsMock = ws.link("ws://test.dummy/ocr/");

// テスト全体で使う WebSocket接続受付ハンドラ
export const wsHandlers = [ocrWsMock.addEventListener("connection", () => {})];

// テスト中に任意のタイミングで WSメッセージを送る関数
export const sendPreviewWordOcrChanged = ({ previewJobId, state }) => {
  ocrWsMock.broadcast(
    JSON.stringify({
      type: "preview_word_ocr_changed",
      preview_job_id: previewJobId,
      state,
    }),
  );
};

// isOcring中の動作確認用
// release() が呼ばれるまでWS完了通知を送らないことで、OCR待ち状態を再現する。
export const createMockOcrGate = ({ previewJobId }) => {
  return {
    release: (options) => {
      sendPreviewWordOcrChanged({
        previewJobId,
        ...options,
      });
    },
  };
};
