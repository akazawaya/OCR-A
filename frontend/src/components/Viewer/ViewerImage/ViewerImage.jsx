import { useRef } from "react";

import { useScroll } from "../../../logic/layout/useScroll";
import { useClientSizePx } from "../../../logic/layout/useClientSizePx";

import WordOverlay from "./WordOverlay";

const ViewerImage = ({
  data: {
    contentRef,
    pages = [],
    isPrintMode = false,
    page,
    zoom,
    rotate,
    selectedBy,
    selectedId,
  } = {},
  wordOverlayData,
  wordOverlayActions,
}) => {
  const localRef = useRef(null);
  const rootRef = contentRef ?? localRef;
  // page変更に追随してスクロールする
  useScroll({ rootRef, targetAttrName: "data-page", targetAttrValue: page });
  const { clientSizePx } = useClientSizePx(rootRef);
  const limitW = clientSizePx.w;
  // viewerImage起点のwordの選択時、viewerTable側を追随スクロールする
  const shouldScroll = selectedBy === "table";
  useScroll({
    rootRef,
    targetAttrName: "data-word",
    targetAttrValue: selectedId,
    shouldScroll,
  });

  return (
    <div ref={rootRef} data-print-root={isPrintMode ? "true" : undefined}>
      {pages.map((p) => {
        const imageW = Number(p.width_px);
        const imageH = Number(p.height_px);
        const safeRotate = isPrintMode ? 0 : rotate;
        const zoomScale = isPrintMode ? 1 : zoom / 100;
        const baseScale = isPrintMode ? 1 : limitW / imageW;
        const finalScale = baseScale * zoomScale;

        const w = imageW * finalScale;
        const h = imageH * finalScale;
        const containerW = safeRotate === 90 || safeRotate === 270 ? h : w;
        const containerH = safeRotate === 90 || safeRotate === 270 ? w : h;
        const containerClass = isPrintMode ? "relative" : "relative mx-auto";
        // 回転時は軸を中心に据えるため、画像要素そのものを親コンテナ中央に配置する。
        // top-1/2 left-1/2で要素の左上を親コンテナ中央へ置き、
        // -translate-x/y-1/2で要素自身の半分だけ戻す。
        // origin-centerにより、その中央位置を基準にrotateする。
        const imageClass = isPrintMode
          ? "relative"
          : "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 origin-center rotate-(--rotate)";
        const containerStyle = isPrintMode
          ? { width: containerW, height: containerH, margin: 0 }
          : { width: containerW, height: containerH };
        const imageStyle = isPrintMode
          ? { width: w, height: h }
          : { width: w, height: h, "--rotate": `${safeRotate}deg` };

        return (
          <div
            key={p.id}
            className={containerClass}
            data-page={p.page_number}
            data-print-page={isPrintMode ? "true" : undefined}
            style={containerStyle}
          >
            <div
              aria-label={`画像表示エリア ${p.page_number}ページ目`}
              className={imageClass}
              role="group"
              style={imageStyle}
            >
              <img alt="" height={h} src={p.image} width={w} />
              <WordOverlay
                actions={wordOverlayActions}
                data={{
                  ...wordOverlayData,
                  pageId: p.id,
                  rotate: safeRotate,
                  clientSizePx: { w, h },
                  imageSizePx: { w: imageW, h: imageH },
                  isPrintMode,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ViewerImage;
