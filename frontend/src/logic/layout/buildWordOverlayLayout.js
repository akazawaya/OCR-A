/**
 * buildWordOverlayLayout.js
 *
 * 責務:
 * - OCR結果のword配列から、overlay描画に必要なレイアウト情報(polygonとspan)を生成する。
 * - clientSizePx(DOM要素のサイズ), imageSizePx(座標系全体のサイズ）を受け取り、拡大縮小に伴うサイズの変更を担う。
 *
 * @param {object} params
 *
 * @param {{ w:number, h:number }} params.clientSizePx
 * - overlayを描画するDOM要素のclientサイズ
 *
 * @param {{ w:number, h:number }} params.imageSizePx
 * - 画像座標系の全体サイズ（幅/高さ）。
 *   wordsの座標（x,y）はこの座標系に属しており、overlay配置では「値/全体サイズ」を%へ変換するための分母として使う。
 *
 * @param {Array<{ id: string|number, bbox: Array<[number, number]>, content: string|null }>} [params.words]
 * - OCR結果のwordの配列。bboxは頂点座標[[x1,y1],[x2,y2],...]を想定
 *
 * @returns {object} result
 *
 * @property {Array<{
 *   id: string|number,
 *   polygon: { points: string },
 *   span: {
 *     style: { left: string, top: string, width: string, height: string },
 *     text: string,
 *     mode: "vertical"|"horizontal",
 *     fontPx: number
 *   }
 * }>} result.wordLayout
 * - overlay描画用のアイテム配列（<polygon>用 + <span>用）
 *
 * 特筆事項:
 * 内部関数について
 * - bboxToRect: bboxからspan配置用のrect(画像座標系)を算出する
 * - measureTextPx: canvasで文字幅計測
 * - decideWritingMode: 縦書き/横書きの判定(縦書きは排除を検討中)
 * - fitFontPxHorizontal/Vertical: bbox内に収めるためのfontPxの計算
 *
 */

const getAppFontFamily = () => {
  return getComputedStyle(document.documentElement)
    .getPropertyValue("--app-font-family")
    .trim();
};

// x, yの最大値/最小値からrect{ left, top, width, height }を得る
// この値を基にrectStyleに変換して、spanの絶対座標に使う
function bboxToRect(bbox) {
  const xs = bbox.map(([x]) => x);
  const ys = bbox.map(([, y]) => y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const right = Math.max(...xs);
  const bottom = Math.max(...ys);
  return { left, top, width: right - left, height: bottom - top };
}

// span上に描画される文字の大きさを調整する(はみ出さないようにする）ため、
// まず、レンダリング時の大きさを想定して、同等のフォント設定を与えた時の文字幅(px)を計測する。
// 計測には、<canvas>のrendering context(_ctx)の文字計測機能を使う。
// contextはletで使い回す。
let _ctx = null;
function measureTextPx(text, fontPx, fontFamily) {
  if (!_ctx) _ctx = document.createElement("canvas").getContext("2d");
  if (!_ctx) return 0;
  _ctx.font = `${fontPx}px ${fontFamily}`;
  return _ctx.measureText(text).width;
}

// 縦横の推定（YomiTokuのw.directionを使わないのはOCRモデルの差し変えに備えるため
// 推定ルール：縦に十分細長いなら縦、そうでなければ横）
function decideWritingMode(rect) {
  const aspect = rect.height / rect.width;
  return aspect >= 2.0 ? "vertical" : "horizontal";
}

// span上の文字の大きさを最適化する。(横書き)
// boxWPx: spanに割り当てる予定の表示領域の幅（bboxをscaleでpx換算した値）
// textWPx: fontPx/fontFamily を適用した場合の文字列幅(px)（canvasで計測）
// 1) boxHPxの表示領域"高さ"から,fontPxの初期値を設定（文字の高さ ≒ 箱の高さと仮定）
// 2) textWPx > boxWPx の場合は、はみ出さないようboxWPx/textWPxの割合で縮小する
function fitFontPxHorizontal(rect, scale, text, fontFamily) {
  const boxWPx = rect.width * scale.sx;
  const boxHPx = rect.height * scale.sy;
  let fontPx = Math.max(1, boxHPx);
  const textWPx = measureTextPx(text, fontPx, fontFamily) || 1;
  if (textWPx > boxWPx) fontPx = Math.max(1, fontPx * (boxWPx / textWPx));
  return fontPx;
}

// span上の文字の大きさを最適化する。(縦書き)
// 1) boxHPx/n: 有効文字数 n で boxHPx を等分した値 これを1文字あたりの許容高さとする
//    （1文字の高さ ≒ 箱の高さ/n と仮定）
//    ※ CSS縦書きをDOMで実測するのは重く、canvasでは縦組みを計測しにくいため、このように近似する
// 2) boxWPx: 1文字あたりの許容幅（幅制約）として扱う
// 3) 幅制約boxWPx と 高さ制約boxHPx/n の小さい方をfontPxとして採用し、安全マージン0.95を掛ける
function fitFontPxVertical(rect, scale, text) {
  const boxWPx = rect.width * scale.sx;
  const boxHPx = rect.height * scale.sy;
  const s = String(text ?? "").trim();
  const n = Array.from(s).length;
  return Math.max(1, Math.min(boxWPx, boxHPx / n) * 0.95);
}

const toPercent = (v, base) => `${(v / base) * 100}%`;

export const buildWordOverlayLayout = ({
  clientSizePx,
  imageSizePx,
  words = [],
}) => {
  if (!imageSizePx || !clientSizePx?.w || !clientSizePx?.h)
    return { wordLayout: [] };

  const fontFamily = getAppFontFamily();

  //　scale { sx, sy } 元画像の1単位が画面上で何pxに相当するかの倍率を返す
  const scale = {
    sx: clientSizePx.w / imageSizePx.w,
    sy: clientSizePx.h / imageSizePx.h,
  };

  const items = [];

  for (const w of words) {
    const bbox = w.bbox ?? [];
    if (!bbox.length) continue;

    const rect = bboxToRect(bbox);

    const rectStyle = {
      left: toPercent(rect.left, imageSizePx.w),
      top: toPercent(rect.top, imageSizePx.h),
      width: toPercent(rect.width, imageSizePx.w),
      height: toPercent(rect.height, imageSizePx.h),
    };

    const text = `${w.content ?? ""} `;
    const mode = decideWritingMode(rect);
    const fontPx =
      mode === "vertical"
        ? fitFontPxVertical(rect, scale, text)
        : fitFontPxHorizontal(rect, scale, text, fontFamily);
    const points = bbox.map(([x, y]) => `${x},${y}`).join(" ");

    items.push({
      id: w.id,
      polygon: { points },
      span: { style: rectStyle, text, mode, fontPx },
    });
  }
  return { wordLayout: items };
};
