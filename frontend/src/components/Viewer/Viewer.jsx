import { ViewerProviders } from "../../contexts/viewer/ViewerProviders";

import ViewerImage from "./ViewerImage/ViewerImage";
import styles from "./Viewer.module.css";
import ViewerTopBar from "./ViewerTopbar/ViewerTopbar";
import ViewerTable from "./VIewerTable/ViewerTable";

export default function Viewer({
  pages = [],
  words = [],
  wordSchema = [],
  loading,
  onClickColumn,
  commitDraftById,
}) {
  return (
    <ViewerProviders
      pages={pages}
      words={words}
      commitDraftById={commitDraftById}
    >
      <div className={styles.viewerRoot}>
        <ViewerTopBar />
        <div className={styles.viewerContent}>
          <div className={styles.imagePane}>
            <ViewerImage pages={pages} />
          </div>
          <div className={styles.tablePane}>
            <ViewerTable
              columns={wordSchema}
              rows={words}
              loading={loading}
              onClickColumn={onClickColumn}
            />
          </div>
        </div>
      </div>
    </ViewerProviders>
  );
}
