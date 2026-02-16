// Image.jsxという名前にしたかったが名前衝突で自動保管が機能しないっぽい
import { useEffect, useRef } from "react";
import styles from "./ViewerImage.module.css";
import WordOverlay from "./WordOverlay/WordOverlay";
import { useViewerPageStateContext } from "../../../contexts/viewer/ViewerPageStateContext";
import { useViewerWordStateContext } from "../../../contexts/viewer/ViewerWordStateContext";
// データソースではないため、useBoxesOverlayを直で呼んでも問題なし(コンフィグを持たせたい場合は再考慮が必要かと思う)

export default function ViewerImage({ rows = [] }) {
  const rootRef = useRef(null);
  const viewerPageState = useViewerPageStateContext();
  const viewerWordState = useViewerWordStateContext();
  const { values: { page, zoom, rotate } = {} } = viewerPageState;
  const { values: { selectedBy, selectedWordId } = {} } = viewerWordState;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const element = root.querySelector(`[data-page="${page}"]`);
    if (!element) return;

    element.scrollIntoView({ behavior: "auto", block: "start" });
  }, [page]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (selectedBy !== "table") return;

    const element = root.querySelector(`[data-word="${selectedWordId}"]`);
    if (!element) return;

    element.scrollIntoView({ behavior: "auto", block: "start" });
  }, [selectedBy, selectedWordId]);

  if (!rows.length) return <div>Loading…</div>;

  return (
    <div
      ref={rootRef}
      className={styles.viewerRoot}
      style={{ "--zoom": zoom, "--rotate": rotate }}
    >
      {" "}
      {/* useRef(null) を作っただけでは参照されない */}
      {rows.map((r) => (
        <div key={r.id} className={styles.page} data-page={r.page_number}>
          {" "}
          {/* CSSセレクタでピックするための符合 */}
          <div className={styles.pageInner} style={{ position: "relative" }}>
            <img
              src={r.image}
              className={styles.pageImage}
              width={r.image_width}
              height={r.image_height}
            />{" "}
            {/* CLS対応のため画像サイズを指定 */}
            <WordOverlay pageId={r.id} />
          </div>
        </div>
      ))}
    </div>
  );
}
