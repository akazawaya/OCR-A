/**
 * useClientSizePx.js
 *
 * 責務:
 * - ref に紐付けたDOM要素(element)のclientサイズ（px）を監視し、{ w, h } を返す。
 *
 * @param {import("react").RefObject<HTMLElement>} elementRef
 * - 計測対象のDOM要素を指すref
 *
 * @returns {{ clientSizePx: { w: number, h: number } }}
 * - clientSizePx: { w, h } で、DOM要素のclientWidthとclientHeightを返す
 * 　※ Pxが2次元 {w,h}を持つならばFooSizePxという命名にする
 *
 * 特筆事項:
 * - 他の用途でも使えるようにhooks化しているが、img側のsvg→wordのマスクのsize追随用として導入した。
 * 　svgはdivにwidth/height:100%で追随している想定のため、divのsizeが分かれば十分である。
 *
 * - ro.disconnect() しないとメモリリークや不要なコールバックが発生する恐れがある
 *
 */

import { useLayoutEffect, useState } from "react";

export const useClientSizePx = (elementRef) => {
  const [clientSizePx, setClientSizePx] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setClientSizePx((prev) =>
        prev.w === w && prev.h === h ? prev : { w, h },
      );
      // 重さの軽減（w,hが前と同じ値ならsetしない）
    };

    update(); //　初期サイズ確定のため一回呼ぶ
    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => ro.disconnect();
  }, [elementRef]);
  return { clientSizePx };
};
