// Image.jsxという名前にしたかったが名前衝突で自動保管が機能しないっぽい
// fetch部分が被っているところは、後から対応予定
import { useEffect, useState } from "react";
import { requestApi } from "../../../api/requestApi";
import styles from "./ViewerImage.module.css";


export default function ViewerImage({
    fetchBase:{dataUrl},
    fetchFlow:{refresh, query},
    options:{rowSelector}
                            }) {
  const [imgs, setImgs] = useState([]);

  useEffect(() => {
    (async () => {
      const url = query ? `${dataUrl}${query}` : dataUrl
      const {data}  = await requestApi(url); 
      const arr = Array.isArray(data) ? data : [];  
      const filtered = rowSelector ? arr.filter(rowSelector) : arr;
      setImgs(filtered);

    })();
  }, [query, refresh]);

  if (!imgs.length) return <div>Loading…</div>;
	
  return (
    <div className={styles.viewerRoot}>
          {imgs.map(i => (
            <div key={i.id} className={styles.page}>
              <img src={i.image} className={styles.pageImage}/>
            </div>
          ))}
    </div>  
  );
}