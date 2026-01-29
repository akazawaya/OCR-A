// size調整のために仮で文字のサイズを出力して、その幅の大きさと比較する
// span に使う fontFamily(index.css の :root と同じ値)
const FONTFAMILY = "system-ui, Avenir, Helvetica, Arial, sans-serif";

function bboxToRect(bbox) {
  const xs = bbox.map(([x]) => x);
  const ys = bbox.map(([, y]) => y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const right = Math.max(...xs);
  const bottom = Math.max(...ys);
  return { left, top, width: right - left, height: bottom - top };
}

// polygon上に描画されるspanのサイズを最適化する（拡大＆縮小）
// 1つだけ Canvas を使い回す（毎回 create しない）
let _ctx = null;
function measureTextPx(text, fontPx, fontFamily) {
  if (!_ctx) _ctx = document.createElement("canvas").getContext("2d");
  // 描画用の領域（ビットマップ）<canvas>の文字計測機能だけ使うことができる
  if (!_ctx) return 0;
  _ctx.font = `${fontPx}px ${fontFamily}`;
  return _ctx.measureText(text).width;
}

// 縦横の認識（w.directionを使わないのはOCRモデルの差し変えに備えるため）
function decideWritingMode(rect) {
  const aspect = rect.height / rect.width;
  // 決定ルール：縦に十分細長いなら縦、そうでなければ横
  return aspect >= 2.0 ? "vertical" : "horizontal";
}

// rect=w.bboxの値からのスケール, scale=レイアウト基準のスケール
function fitFontPxHorizontal(rect, scale, text, fontFamily) {
  const boxWpx = rect.width * scale.sx;
  const boxHpx = rect.height * scale.sy;
  let fontPx = Math.max(1, boxHpx); // 文字の高さ ≒ 箱の高さ このサイズで文字列幅を測る
  const textW = measureTextPx(text, fontPx, fontFamily) || 1;
  if (textW > boxWpx) fontPx = Math.max(1, fontPx * (boxWpx / textW)); //箱幅を超えるなら縮小
  return fontPx;
}

function fitFontPxVertical(rect, scale, text) {
  const boxWpx = rect.width * scale.sx;
  const boxHpx = rect.height * scale.sy;
  const s = String(text ?? "").trim();
  const n = Array.from(s).length;
  return Math.max(1, Math.min(boxWpx, boxHpx / n) * 0.95);
}

const pct = (v, base) => `${(v / base) * 100}%`;

export const buildWordOverlayLayout = ({layerPx, meta, words = []}) => {
  if (!meta || !layerPx?.w || !layerPx?.h) return { wordLayout: [] };
  // レイアウト基準のスケール layerPx（レンダー要素から直接得た要素のwhのpx)とmeta（DBからのwh座標系)から、
  // sx, sy 元画像の1単位が画面上で何pxに相当するかの倍率を返す
  const scale = { sx:layerPx.w / meta.w, sy:layerPx.h / meta.h };
  
  const items = [];

  for (const w of words) {
    const bbox = w.bbox ?? [];
    if (!bbox.length) continue;

    const rect = bboxToRect(bbox);
  
    const rectStyle = {
      left: pct(rect.left, meta.w),
      top: pct(rect.top, meta.h),
      width: pct(rect.width, meta.w),
      height: pct(rect.height, meta.h),
    };

    const text = `${w.content ?? ""} `;
    const mode = decideWritingMode(rect);
    const fontPx =
      mode === "vertical"
        ? fitFontPxVertical(rect, scale, text)
        : fitFontPxHorizontal(rect, scale, text, FONTFAMILY);
    const points = bbox.map(([x, y]) => `${x},${y}`).join(" ");
    if (!points) continue;

    items.push({ id: w.id, points, rectStyle, text, mode, fontPx });
  }

  return { wordLayout: items };
};
