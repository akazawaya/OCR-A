// Image.jsxという名前にしたかったが名前衝突で自動保管が機能しないっぽい
import { useRef } from "react";

import { useViewerPageStateContext } from "../../../contexts/viewer/ViewerPageStateContext";
import { useViewerWordStateContext } from "../../../contexts/viewer/ViewerWordStateContext";
import { useScroll } from "../../../hooks/layout/useScroll";

import styles from "./ViewerImage.module.css";
import WordOverlay from "./WordOverlay/WordOverlay";
// データソースではないため、useBoxesOverlayを直で呼んでも問題なし(コンフィグを持たせたい場合は再考慮が必要かと思う)

export default function ViewerImage({ data: { pages = [] } = {} }) {
  const rootRef = useRef(null);
  const viewerPageState = useViewerPageStateContext();
  const viewerWordState = useViewerWordStateContext();
  const { data: { page, zoom, rotate } = {} } = viewerPageState;
  const { data: { selectedBy, selectedWordId } = {} } = viewerWordState;

  // page変更に追随してスクロールする
  useScroll({ rootRef, targetAttrName: "data-page", targetAttrValue: page });

  // viewerImage起点のwordの選択時、viewerTable側を追随スクロールする
  const shouldScroll = selectedBy === "table";
  useScroll({
    rootRef,
    targetAttrName: "data-word",
    targetAttrValue: selectedWordId,
    shouldScroll,
  });

  if (!pages.length) return <div>Loading…</div>;

  return (
    <div
      ref={rootRef}
      className={styles.viewerRoot}
      style={{ "--zoom": zoom, "--rotate": rotate }}
    >
      {/* useRef(null) を作っただけでは参照されない */}
      {pages.map((r) => (
        <div key={r.id} className={styles.page} data-page={r.page_number}>
          {/* CSSセレクタでピックするための符合 */}
          <div className={styles.pageInner} style={{ position: "relative" }}>
            <img
              alt=""
              src={r.image}
              className={styles.pageImage}
              width={r.image_width}
              height={r.image_height}
            />
            {/* CLS対応のため画像サイズを指定 */}
            <WordOverlay data={{ pageId: r.id }} />
          </div>
        </div>
      ))}
    </div>
  );
}
