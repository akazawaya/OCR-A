/**
 * useClientSizePx.js
 *
 * 責務:
 * - ref に紐付けたDOM要素(element)のclientサイズ（px）を監視し、{ w, h } を返す。
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
