import { bboxToBounds } from "../transforms/bboxTransforms";

const compareViewerWords = (wordA, wordB) => {
  const pageDiff = wordA.page__page_number - wordB.page__page_number;
  if (pageDiff !== 0) return pageDiff;

  const aBounds = bboxToBounds(wordA.bbox);
  const bBounds = bboxToBounds(wordB.bbox);

  const aDirection = wordA.direction;
  const bDirection = wordB.direction;

  // 縦書きは右→左、上→下を優先する。
  if (aDirection === 2 || bDirection === 2) {
    if (aDirection !== 2) return 1;
    if (bDirection !== 2) return -1;
    if (aBounds.xMax !== bBounds.xMax) return bBounds.xMax - aBounds.xMax;
  }

  // 横書きは上→下、左→右を優先する。
  if (aBounds.yMin !== bBounds.yMin) return aBounds.yMin - bBounds.yMin;
  if (aBounds.xMin !== bBounds.xMin) return aBounds.xMin - bBounds.xMin;
  if (aBounds.xMax !== bBounds.xMax) return aBounds.xMax - bBounds.xMax;

  return String(wordA.id).localeCompare(String(wordB.id));
};

export const sortViewerWords = ({ words = [] } = {}) => {
  return [...words].sort(compareViewerWords);
};
