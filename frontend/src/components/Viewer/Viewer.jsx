import Table from "../Table/Table"
import ViewerImage from "./ViewerImage/ViewerImage"
import styles from "./Viewer.module.css";
import ViewerTopBar from "./ViewerTopbar/ViewerTopbar";

export default function Viewer({ fetchBase, fetchFlow, navigation, options }) {
  const { refresh, query } = fetchFlow;

  return (
    <div className={styles.viewerRoot}> 
      <ViewerTopBar/>
      <div className={styles.viewerContent}>
        <ViewerImage
          fetchBase={fetchBase}
          fetchFlow={{ refresh, query }}
          options={options}
        />
      </div>
        <Table 
          fetchBase={fetchBase}
          fetchFlow={{ refresh, query }}
          navigation={navigation}  
          options={options}
        />
    </div>
  )
}
