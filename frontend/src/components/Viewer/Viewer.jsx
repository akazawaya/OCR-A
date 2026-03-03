import { ViewerProviders } from "../../contexts/viewer/ViewerProviders";

import ViewerImage from "./ViewerImage/ViewerImage";
import styles from "./Viewer.module.css";
import ViewerTopBar from "./ViewerTopbar/ViewerTopbar";
import ViewerTable from "./VIewerTable/ViewerTable";

export default function Viewer({
  pageRows = [],
  wordRows = [],
  wordColumns = [],
  loading,
  onClickColumn,
  commitDraftById,
}) {
  return (
    <ViewerProviders
      pageRows={pageRows}
      wordRows={wordRows}
      commitDraftById={commitDraftById}
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
              onClickColumn={onClickColumn}
            />
          </div>
        </div>
      </div>
    </ViewerProviders>
  );
}
