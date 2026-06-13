export const PREVIEW_WORD_OCR_STATE = Object.freeze({
  QUEUED: 1,
  PROCESSING: 2,
  SUCCESS: 3,
  FAILED: 4,
});

const previewWordOcrStateLabelByValue = Object.freeze({
  [PREVIEW_WORD_OCR_STATE.QUEUED]: "QUEUED",
  [PREVIEW_WORD_OCR_STATE.PROCESSING]: "PROCESSING",
  [PREVIEW_WORD_OCR_STATE.SUCCESS]: "SUCCESS",
  [PREVIEW_WORD_OCR_STATE.FAILED]: "FAILED",
});

export const normalizePreviewWordOcrJobResult = (previewJob) => {
  if (!previewJob) return previewJob;
  return {
    ...previewJob,
    state: previewWordOcrStateLabelByValue[previewJob.state],
  };
};
