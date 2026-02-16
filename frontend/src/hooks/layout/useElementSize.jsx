import { useLayoutEffect, useRef, useState } from "react";

// 責務：useLayoutEffectで直接DOM実体を掴み、ref, layerPxを返す

export const useElementSize = () => {
  const ref = useRef(null);
  const [layerPx, setLayerPx] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setLayerPx((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
      // 重さの軽減（w,hが前と同じ値ならsetしない）
    };
    update(); //　初期サイズ確定のため一回呼ぶ
    // ResizeObserver...監視用標準API　要素単位でサイズ変化を監視できる
    const ro = new ResizeObserver(update); // サイズ変化を検知したらupdateを呼ぶ監視者を作る

    ro.observe(el); // 監視者に要素elementを監視対象として登録する

    return () => ro.disconnect(); // disconnectしないとメモリリークや不要なコールバックが発生する恐れがある
  }, []);

  return { ref, layerPx };
};
