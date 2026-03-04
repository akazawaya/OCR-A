import ViewerImage from "./ViewerImage/ViewerImage";
import styles from "./Viewer.module.css";
import ViewerTopBar from "./ViewerTopbar/ViewerTopbar";
import ViewerTable from "./VIewerTable/ViewerTable";

export default function Viewer({
  data: { pages = [], words = [], wordSchema = [], loading } = {},
  events: { onClickColumn } = {},
}) {
  return (
    <div className={styles.viewerRoot}>
      <ViewerTopBar />
      <div className={styles.viewerContent}>
        <div className={styles.imagePane}>
          <ViewerImage data={{ pages }} />
        </div>
        <div className={styles.tablePane}>
          <ViewerTable
            data={{ columns: wordSchema, rows: words, loading }}
            events={{ onClickColumn }}
          />
        </div>
      </div>
    </div>
  );
}
