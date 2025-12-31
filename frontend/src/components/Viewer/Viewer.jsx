import ViewerImage from "./ViewerImage/ViewerImage"
import styles from "./Viewer.module.css";
import ViewerTopBar from "./ViewerTopbar/ViewerTopbar";
import Table from "../Table/Table";

export default function Viewer({
  pageData = {},
  wordData = {},
  navigation:{ onColumnClick } = {},
  // onRowClickでマスクのfuncがあってもいいかも
  viewer,
  }) {
  return (
    <div className={styles.viewerRoot}> 
      <ViewerTopBar
        viewer={ viewer }
      />
      <div className={styles.viewerContent}>
        <div className={styles.imagePane}>
          <ViewerImage
            data={ pageData }
            viewer={ viewer }
          />
        </div>
        <div className={styles.tablePane}>
          <Table
            data={ wordData }
            navigation={{ onColumnClick:onColumnClick }}
            viewer={ viewer }
          />
        </div>
      </div>
    </div>
  )
}
