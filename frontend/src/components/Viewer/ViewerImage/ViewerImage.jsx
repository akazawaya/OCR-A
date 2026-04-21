import { useCallback, useRef } from "react";

import { useScroll } from "../../../logic/layout/useScroll";
import { useClientSizePx } from "../../../logic/layout/useClientSizePx";

import WordOverlay from "./WordOverlay/WordOverlay";

const ViewerImage = ({
  data: {
    pages = [],
    printRef,
    isPrintMode = false,
    page,
    zoom,
    rotate,
    selectedBy,
    selectedId,
  } = {},
  wordOverlayData,
  wordOverlayEvents,
}) => {
  const rootRef = useRef(null);
  const setRefs = useCallback(
    (node) => {
      rootRef.current = node;
      if (typeof printRef === "function") printRef(node);
      else if (printRef) printRef.current = node;
    },
    [printRef],
  );
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
    <div ref={setRefs} data-print-root={isPrintMode ? "true" : undefined}>
      {pages.map((p) => {
        const imageW = Number(p.width_px) || 0;
        const imageH = Number(p.height_px) || 0;
        const safeRotate = isPrintMode ? 0 : rotate;
        const zoomScale = isPrintMode ? 1 : zoom / 100;
        const baseScale = isPrintMode ? 1 : imageW ? limitW / imageW : 1;
        const finalScale = baseScale * zoomScale;

        const w = imageW * finalScale;
        const h = imageH * finalScale;
        const containerW = safeRotate === 90 || safeRotate === 270 ? h : w;
        const containerH = safeRotate === 90 || safeRotate === 270 ? w : h;
        const containerClass = isPrintMode ? "relative" : "relative mx-auto";
        const imageClass = isPrintMode
          ? "relative"
          : "absolute top-1/2 left-1/2 origin-center -translate-x-1/2 -translate-y-1/2 rotate-(--rotate)";
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
              className={imageClass}
              data-testid={`viewer-image-transform-${p.id}`}
              style={imageStyle}
            >
              <img alt="" height={h} src={p.image} width={w} />
              <WordOverlay
                data={{
                  ...wordOverlayData,
                  pageId: p.id,
                  clientSizePx: { w, h },
                  imageSizePx: { w: imageW, h: imageH },
                }}
                events={wordOverlayEvents}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ViewerImage;
