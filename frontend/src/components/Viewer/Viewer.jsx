import Table from "../Table/Table"
import ViewerImage from "./ViewerImage/ViewerImage"
import styles from "./Viewer.module.css";

export default function Viewer({ fetchBase, fetchFlow, navigation, options }) {
  const { refresh, query } = fetchFlow;

  return (
    <div className={styles.viewerRoot}> 
      <ViewerImage
        fetchBase={fetchBase}
        fetchFlow={{ refresh, query }}
        options={options}
      />

      <Table 
        fetchBase={fetchBase}
        fetchFlow={{ refresh, query }}
        navigation={navigation}  
        options={options}
      />
    </div>
  )
}
