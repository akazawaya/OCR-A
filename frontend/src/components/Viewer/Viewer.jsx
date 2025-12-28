import ViewerImage from "./ViewerImage/ViewerImage"
import styles from "./Viewer.module.css";
import ViewerTopBar from "./ViewerTopbar/ViewerTopbar";
import Table from "../Table/Table";

export default function Viewer({
  pageData:{ rows: pageRows } = {},
  wordData:{ columns, rows: wordRows, loading } = {},
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
        data={{ rows: pageRows }}
        viewer={ viewer }
        />
        <Table 
        data={{ columns, rows: wordRows, loading }}
        navigation={{ onColumnClick:onColumnClick  }}
        />
      </div>
    </div>
  )
}
