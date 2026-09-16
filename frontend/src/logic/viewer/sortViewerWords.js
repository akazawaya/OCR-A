import { bboxToBounds } from "../transforms/bboxTransforms";

/**
 * このコードでは二つの要素wordA, B及び各プロパティのsortを
 * 最終的にArray.prototype.sort()に投げることで実現する。
 *
 * 比較関数の戻り値が負数ならAが前、正数ならBが前、0なら同順位として扱われるが、
 * このコードでは、一部の比較結果を-1、0、1に正規化している。
 *
 * ※ sort()に渡すのは比較関数(AとBを受取り負数、0、正数を返す関数)で、
 * 正負の数値や比較対象のA,Bではない点に注意
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
 */

/**
 * 2つのViewerWordの既定の読み順を比較する。
 * 優先順は page → direction → bbox座標 → id。
 *
 * @param {ViewerWord} wordA
 * @param {ViewerWord} wordB
 * @returns {number} wordAが先なら負、同順なら0、wordBが先なら正
 */
const compareViewerWordsInReadingOrder = (wordA, wordB) => {
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

/**
 * ViewerWordを既定の読み順で並べ替える。
 *
 * @param {ViewerWord[]} words
 * @returns {ViewerWord[]} 並べ替えられた新しい配列
 */
const sortViewerWordsInReadingOrder = (words = []) => {
  return [...words].sort(compareViewerWordsInReadingOrder);
};

/**
 * ViewerWordを指定されたカラムで並べ替える。
 * keyとorderによってカラム名と並び順を指定する。
 * カラム値がnullの場合は昇順・降順ともに末尾へ配置する。
 *
 * @param {Object} params
 * @param {ViewerWord[]} params.words
 * @param {string} params.key カラム名
 * @param {"asc" | "desc"} params.order
 * @returns {ViewerWord[]} 並べ替えられた新しい配列
 */
const sortViewerWordsByColumn = ({ words, key, order }) => {
  return [...words].sort((wordA, wordB) => {
    const valueA = wordA[key];
    const valueB = wordB[key];

    if (valueA == null && valueB == null) return 0; // 同列として現状維持
    if (valueA == null) return 1; // valueAが後→nullを後列に移動
    if (valueB == null) return -1; // valueBが後→nullを後列に移動

    // nullの値ではない場合はvalueを直で比較
    // JSの比較演算子は両者が同じ型であればstrもnumberも対応可能
    const comparison = valueA < valueB ? -1 : valueA > valueB ? 1 : 0;

    return order === "desc" ? -comparison : comparison;
  });
};

export const sortViewerWords = ({ words = [], wordSort = null } = {}) => {
  if (wordSort === null) {
    return sortViewerWordsInReadingOrder(words);
  }

  return sortViewerWordsByColumn({
    words: sortViewerWordsInReadingOrder(words),
    key: wordSort.key,
    order: wordSort.order,
  });
};
