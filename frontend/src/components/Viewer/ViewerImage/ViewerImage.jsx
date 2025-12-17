// Image.jsxという名前にしたかったが名前衝突で自動保管が機能しないっぽい
import styles from "./ViewerImage.module.css";
export default function ViewerImage({
  data:{rows},
  }) {
  if (!rows.length) return <div>Loading…</div>;
	
  return (
    <div className={styles.viewerRoot}>
          {rows.map(i => (
            <div key={i.id} className={styles.page}>
              <img src={i.image} className={styles.pageImage}/>
            </div>
          ))}
    </div>  
  );
}