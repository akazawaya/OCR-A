// Image.jsxという名前にしたかったが名前衝突で自動保管が機能しないっぽい
import { useEffect, useRef } from "react";
import styles from "./ViewerImage.module.css";
// データソースではないため、useBoxesOverlayを直で呼んでも問題なし(コンフィグを持たせたい場合は再考慮が必要かと思う)

export default function ViewerImage({
  pageData = {}, 
  wordData = {}, 
  viewerPageState = {},
  viewerWordState = {}  
  }) {
  const { rows = [] } = pageData;
  const { page, zoom, rotate } = viewerPageState;
  const imageRef = useRef(null);
  const { getOverlayForPage } = viewerWordState;

  useEffect(() => {
    const root = imageRef.current;
    if (!root) return;

    const element = root.querySelector(`[data-page="${page}"]`);
    // querySelectorはCSSセレクタを用いて合致するDOMを検索する機能
    if (!element) return;

    element.scrollIntoView({ behavior: "auto", block: "start" }); 
  }, [page, rows.length]);

  if (!rows.length) return <div>Loading…</div>;
	
  return (
    <div ref={imageRef} 
      className={styles.viewerRoot}
      style={{ "--zoom": zoom, "--rotate": rotate }}>  {/* useRef(null) を作っただけでは参照されない */}
      {rows.map(i => (
        
        <div key={i.id} className={styles.page} 
          data-page={i.page_number}> {/* CSSセレクタでピックするための符合 */}
          <div className={styles.pageInner} style={{ position: "relative" }}>
            <img src={i.image} className={styles.pageImage}/>
            {getOverlayForPage(i.id)}
          </div>
        </div>
          ))}
    </div>  
  );
}