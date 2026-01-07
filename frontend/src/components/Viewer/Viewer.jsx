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
  const { page, zoom, rotate,
    setPage, setZoom, setRotate,
    commitPage, commitZoom, commitRotate,
    ZOOM_STEP, ROTATE_STEP,
  } = viewerPageState;
  const {
    pageMetaById, wordsByPageId,
    hoveredWordId, selectedWordId, selectedBy,
    hoverWord, clearHoveredWord, commitSelectWord,
  } = viewerWordState;

  const { columns = [], rows = [], loading } = wordData;
  const { rows: pageRows = [] } = pageData;
  return (
    <div className={styles.viewerRoot}> 
      <ViewerTopBar
        viewerPageState={{
          values: { page, zoom, rotate, ZOOM_STEP, ROTATE_STEP },
          events: {
            onPageChange: setPage,
            onZoomChange: setZoom,
            onRotateChange: setRotate,
            onPageCommit: commitPage,
            onZoomCommit: commitZoom,
            onRotateCommit: commitRotate,
          },
        }}
      />
      <div className={styles.viewerContent}>
        <div className={styles.imagePane}>
          <ViewerImage
            rows={pageRows}
            viewerPageState={{ values: { page, zoom, rotate } }}
            viewerWordState={{
              values: {
                pageMetaById,
                wordsByPageId,
                hoveredWordId,
                selectedWordId,
                selectedBy,
              },
              events: {
                onWordHover: hoverWord,
                onWordHoverClear: clearHoveredWord,
                onWordSelect: commitSelectWord,
              },
            }}
          />
        </div>
        <div className = {styles.tablePane}>
          <ViewerTable
            columns={columns}
            rows={rows}
            loading={loading}
            onColumnClick={columnsSort}
            viewerPageState={{ values: { page } }}
            viewerWordState={{
              values: { hoveredWordId, selectedWordId, selectedBy },
              events: {
                onRowMouseEnter: hoverWord,
                onRowMouseLeave: clearHoveredWord,
                onRowClick: commitSelectWord,
              },
            }}
          />
        </div>
      </div>
    </div>
  )
}
