import ViewerImage from "./ViewerImage/ViewerImage"
import styles from "./Viewer.module.css";
import ViewerTopBar from "./ViewerTopbar/ViewerTopbar";
import Table from "../Table/Table";

export default function Viewer({
  data:{ columns, rows, loading, 
    page, zoom, rotate, setPage, setZoom, setRotate, commitPage, commitZoom, commitRotate
    } = {},
  options:{onDataRouting: routingRowFilter} = {},
                          }) {
  return (
    <div className={styles.viewerRoot}> 
      <ViewerTopBar
      data={{ page, zoom, rotate, setPage, setZoom, setRotate, commitPage, commitZoom, commitRotate }}
      />

      <div className={styles.viewerContent}>
        <ViewerImage
        data={{ rows, page, zoom, rotate }}
        />
        <Table 
        data={{ columns, rows, loading }}
        options={{onDataRouting: routingRowFilter}}
        />
      </div>
    </div>
  )
}
