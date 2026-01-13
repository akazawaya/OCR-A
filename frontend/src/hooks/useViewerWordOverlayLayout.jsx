import { useLayoutEffect, useMemo, useRef, useState } from "react";

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
  //　描画用の領域（ビットマップ）<canvas>の文字計測機能だけ使うことができる
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
// ↑暫定でうまくいっているように見える

const pct = (v, base) => `${(v / base) * 100}%`;

export const useViewerWordOverlayLayout = (meta, words = []) => {
  const layerRef = useRef(null);
  const [layerPx, setLayerPx] = useState({ w: 0, h: 0 });

  // useLayoutEffectを使うことで、実際のレンダー要素（layerRef.current）のサイズを直接計測できて楽
  // PageState(zoom)とbboxから計算する手もあるが、cssが絡んでズレやすいのでuseLayoutEffectを使ってみる
  useLayoutEffect(() => {
    const el = layerRef.current;
    if (!el) return;

    const update = () => setLayerPx({ w: el.clientWidth, h: el.clientHeight });
    update(); //　初期サイズ確定のため一回呼ぶ
    // ResizeObserver...監視用標準API　要素単位でサイズ変化を監視できる
    const ro = new ResizeObserver(update); // サイズ変化を検知したらupdateを呼ぶ監視者を作る

    ro.observe(el); // 監視者に要素elementを監視対象として登録する

    return () => ro.disconnect(); // disconnectしないとメモリリークや不要なコールバックが発生する恐れがある
  }, []);

  // レイアウト基準のスケール layerPx（レンダー要素から直接得た要素のwhのpx)とmeta（DBからのwh座標系)から、
  // sx, sy　元画像の1単位が画面上で何pxに相当するかの倍率を返す
  const scale = useMemo(() => {
    const sx = layerPx.w / meta.w;
    const sy = layerPx.h / meta.h;
    return { sx, sy };
  }, [layerPx.w, layerPx.h, meta.w, meta.h]);
    
  const wordLayout = useMemo(() => {
    if (!meta) return [];

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

    return items;
  }, [words, meta, scale.sx, scale.sy]);

  return { layerRef, wordLayout };
};
