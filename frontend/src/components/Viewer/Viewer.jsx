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
        <ViewerImage
        data={ pageData }
        viewer={ viewer }
        />
        <Table
        data={ wordData }
        navigation={{ onColumnClick:onColumnClick }}
        />
      </div>
    </div>
  )
}
