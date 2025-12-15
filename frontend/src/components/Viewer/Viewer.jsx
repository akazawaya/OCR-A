import ViewerImage from "./ViewerImage/ViewerImage"
import styles from "./Viewer.module.css";
import ViewerTopBar from "./ViewerTopbar/ViewerTopbar";
import Table from "../Table/Table";

export default function Viewer({
  data:{columns, rows, loading, imgs} = {},
  options:{onDataRouting: routingRowFilter} = {},
                          }) {
  return (
    <div className={styles.viewerRoot}> 
      <ViewerTopBar/>
      <div className={styles.viewerContent}>
        <ViewerImage
        data={{ imgs }}
        />
        <Table 
        data={{ columns, rows, loading }}
        options={{onDataRouting: routingRowFilter}}
        />
      </div>
    </div>
  )
}
