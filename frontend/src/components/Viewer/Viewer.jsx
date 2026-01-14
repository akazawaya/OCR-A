import ViewerImage from "./ViewerImage/ViewerImage"
import styles from "./Viewer.module.css";
import ViewerTopBar from "./ViewerTopbar/ViewerTopbar";
import ViewerTable from "./VIewerTable/ViewerTable";
import { ViewerProviders } from "../../contexts/viewer/ViewerProviders";

export default function Viewer({
  pageRows = [],
  wordRows = [],
  wordColumns = [],
  loading,
  onColumnClick,
  }) {
  return (
    <ViewerProviders
      pageRows={pageRows}
      wordRows={wordRows}
    >
      <div className={styles.viewerRoot}>
        <ViewerTopBar />
        <div className={styles.viewerContent}>
          <div className={styles.imagePane}>
            <ViewerImage rows={pageRows} />
          </div>
          <div className={styles.tablePane}>
            <ViewerTable
              columns={wordColumns}
              rows={wordRows}
              loading={loading}
              onColumnClick={onColumnClick}
            />
          </div>
        </div>
      </div>
    </ViewerProviders>
  )
}
