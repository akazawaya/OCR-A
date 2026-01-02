import ViewerImage from "./ViewerImage/ViewerImage"
import styles from "./Viewer.module.css";
import ViewerTopBar from "./ViewerTopbar/ViewerTopbar";
import Table from "../Table/Table";

export default function Viewer({
  pageData = {},
  wordData = {},
  navigation:{ onColumnClick } = {},
  // onRowClickでマスクのfuncがあってもいいかも
  viewerPageState,
  viewerWordState
  }) {
  return (
    <div className={styles.viewerRoot}> 
      <ViewerTopBar
        viewerPageState={ viewerPageState }
      />
      <div className={styles.viewerContent}>
        <div className={styles.imagePane}>
          <ViewerImage
            pageData={ pageData }
            wordData={ wordData }
            viewerPageState={ viewerPageState }
            viewerWordState={ viewerWordState }
          />
        </div>
        <div className={styles.tablePane}>
          <Table
            data={ wordData }
            navigation={{ onColumnClick:onColumnClick }}
            viewerPageState={ viewerPageState }
          />
        </div>
      </div>
    </div>
  )
}
