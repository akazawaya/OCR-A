import { bboxToBounds } from "../transforms/bboxTransforms";

/**
 * sortViewerWords.js
 *
 * 責務:
 * - word 配列の表示順を compareViewerWords で決める
 * - 優先順は page → direction → bbox座標 → id
 *
 * compareViewerWords
 * @param {ViewerWord} wordA
 * @param {ViewerWord} wordB
 * @returns {number} 負の数なら wordA を先、0 なら同順、正の数なら wordB を先にする。数の大きさは無関係。
 *
 * Array.prototype.sort():
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
 */
const compareViewerWords = (wordA, wordB) => {
  const pageDiff = wordA.page__page_number - wordB.page__page_number;
  if (pageDiff !== 0) return pageDiff;

  const aBounds = bboxToBounds(wordA.bbox);
  const bBounds = bboxToBounds(wordB.bbox);

  const aDirection = wordA.direction;
  const bDirection = wordB.direction;

  // 横書き(direction=1)と縦書き(direction=2)は、横書きを優先する。
  // 縦書きはまず右→左を優先する。
  if (aDirection === 2 || bDirection === 2) {
    if (aDirection !== 2) return -1; // aが横の時→負の数でa,bの順
    if (bDirection !== 2) return 1; // bが横の時→正の数でb,aの順
    if (aBounds.xMax !== bBounds.xMax) return bBounds.xMax - aBounds.xMax; //どちらも縦の時　右→左の比較
  }

  // 横書き同士、または縦書き同士で xMax が同順だった場合、
  // 以降は yMin → xMin の順で比較し、上→下、左→右を優先する。
  if (aBounds.yMin !== bBounds.yMin) return aBounds.yMin - bBounds.yMin; // 上→下の比較
  if (aBounds.xMin !== bBounds.xMin) return aBounds.xMin - bBounds.xMin; // 左→右の比較
  // 最後まで同順なら id の文字列比較で順序を確定する。
  return String(wordA.id).localeCompare(String(wordB.id));
};

export const sortViewerWords = ({ words = [] } = {}) => {
  return [...words].sort(compareViewerWords);
};
