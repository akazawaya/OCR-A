import ViewerImage from "./ViewerImage/ViewerImage"
import styles from "./Viewer.module.css";
import ViewerTopBar from "./ViewerTopbar/ViewerTopbar";
import Table from "../Table/Table";

export default function Viewer({
  pageData:{ rows: pageRows } = {},
  wordData:{ columns, rows: wordRows, loading } = {},
  viewer,
  options:{onDataRouting: routingRowFilter} = {},
                          }) {
  return (
    <div className={styles.viewerRoot}> 
      <ViewerTopBar
      viewer={ viewer }
      />
      <div className={styles.viewerContent}>
        <ViewerImage
        data={{ rows: pageRows }}
        viewer={ viewer }
        options={{onDataRouting: routingRowFilter}}
        />
        <Table 
        data={{ columns, rows: wordRows, loading }}
        options={{onDataRouting: routingRowFilter}}
        />
      </div>
    </div>
  )
}
