import { useRef } from "react";

import { useViewerPageStateContext } from "../../../contexts/viewer/ViewerPageStateContext";
import { useViewerWordStateContext } from "../../../contexts/viewer/ViewerWordStateContext";
import { useScroll } from "../../../logic/layout/useScroll";
import { useClientSizePx } from "../../../logic/layout/useClientSizePx";

import WordOverlay from "./WordOverlay/WordOverlay";

export default function ViewerImage({ data: { pages = [] } = {} }) {
  const rootRef = useRef(null);
  const viewerPageState = useViewerPageStateContext();
  const viewerWordState = useViewerWordStateContext();
  const { data: { page, zoom, rotate } = {} } = viewerPageState;
  const { data: { selectedBy, selectedWordId } = {} } = viewerWordState;

  // page変更に追随してスクロールする
  useScroll({ rootRef, targetAttrName: "data-page", targetAttrValue: page });
  const { clientSizePx } = useClientSizePx(rootRef);
  const limitW = clientSizePx.w;
  // viewerImage起点のwordの選択時、viewerTable側を追随スクロールする
  const shouldScroll = selectedBy === "table";
  useScroll({
    rootRef,
    targetAttrName: "data-word",
    targetAttrValue: selectedWordId,
    shouldScroll,
  });
  return (
    <div ref={rootRef}>
      {pages.map((r) => {
        const zoomScale = zoom / 100;
        const baseScale = limitW / r.width_px;
        const finalScale = baseScale * zoomScale;

        const w = r.width_px * finalScale;
        const h = r.height_px * finalScale;

        return (
          <div
            key={r.id}
            data-page={r.page_number}
            className="relative mx-auto"
            style={{
              width: rotate === 90 || rotate === 270 ? h : w,
              height: rotate === 90 || rotate === 270 ? w : h,
            }}
          >
            <div
              className="absolute top-1/2 left-1/2 origin-center -translate-x-1/2 -translate-y-1/2 rotate-(--rotate)"
              style={{
                width: w,
                height: h,
                "--rotate": `${rotate}deg`,
              }}
            >
              <img alt="" src={r.image} width={w} height={h} />
              <WordOverlay data={{ pageId: r.id, clientSizePx: { w, h } }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
