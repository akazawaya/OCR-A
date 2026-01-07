import ViewerImage from "./ViewerImage/ViewerImage"
import styles from "./Viewer.module.css";
import ViewerTopBar from "./ViewerTopbar/ViewerTopbar";
import ViewerTable from "./VIewerTable/ViewerTable";

export default function Viewer({
  pageData = {},
  wordData = {},
  navigation = {},
  viewerPageState = {},
  viewerWordState = {}

  }) {
  const { columnsSort } = navigation;
  const { hoverWord, clearHoveredWord, commitSelectWord } = viewerWordState;
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
        <div className = {styles.tablePane}>
          <ViewerTable
            data = { wordData }
            navigation = {{ onColumnClick: columnsSort }}
            viewerPageState = { viewerPageState }
            viewerWordState = {{
              values: viewerWordState,
              events: { 
                onRowMouseEnter: hoverWord,
                onRowMouseLeave: clearHoveredWord,
                onRowClick: commitSelectWord,
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}
