// Image.jsxという名前にしたかったが名前衝突で自動保管が機能しないっぽい
import { useEffect, useRef } from "react";
import styles from "./ViewerImage.module.css";


export default function ViewerImage({
  data = {}, 
  viewer = {}
  }) {
  const { rows = [] } = data;
  const { page, zoom, rotate } = viewer;
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const element = root.querySelector(`[data-page="${page}"]`);
    // querySelectorはCSSセレクタを用いて合致するDOMを検索する機能

    if (!element) return;

    element.scrollIntoView({ behavior: "auto", block: "start" }); 
  }, [page, rows.length]);



  if (!rows.length) return <div>Loading…</div>;
	
  return (
    <div ref={rootRef} 
      className={styles.viewerRoot}
      style={{ "--zoom": zoom, "--rotate": rotate }}>  {/* useRef(null) を作っただけでは参照されない */}


      {rows.map(i => (
        <div key={i.id} className={styles.page} 
          data-page={i.id}> {/* CSSセレクタでピックするための符合 */}
          <div className={styles.pageInner}>
            <img src={i.image} className={styles.pageImage}/>
          </div>
        </div>
          ))}
    </div>  
  );
}