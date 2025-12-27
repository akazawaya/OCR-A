import { useReducer } from "react"
import { RefreshContext } from "../contexts/refreshContext"
import { pageApiConfig, wordApiConfig } from "../route";
import Viewer from "../components/Viewer/Viewer";
import { useRouting } from "../hooks/useRouting";
import { useTableData } from "../hooks/useTableData";
import { useViewer } from "../hooks/useViewer";
import { usePageRows } from "../hooks/usePageRows";
//　useParams の返り値は文字列になるのでNumber()で変換しておく

const OcrViewerPage = () => {
  const [refresh, onRefresh] = useReducer(n => n + 1, 0);
  const { search, columnsSort, primaryKey, buildSearch } = useRouting({});


  const pageSearch = primaryKey != null ? buildSearch({ doc: primaryKey }) : search;
  const wordSearch = primaryKey != null ? buildSearch({ page__doc: primaryKey, doc: null }) : search;


  const { dataUrl: pageDataUrl } = pageApiConfig;
  const pageRows = usePageRows(undefined, pageDataUrl, pageSearch);

  const { schemaUrl, schemaName, dataUrl: wordDataUrl } = wordApiConfig;
  const { columns, rows: wordRows, loading } = useTableData(undefined, schemaUrl, schemaName, wordDataUrl, wordSearch, refresh, onRefresh);

  const viewer = useViewer({ maxPage:pageRows.length });

  return (
    <RefreshContext.Provider value={onRefresh}>
      <p>OcrViewerPage</p>
      <Viewer
        pageData={{ rows: pageRows }}
        wordData={{ columns, rows: wordRows, loading }}
        viewer={viewer}
        navigation={{onColumnClick:columnsSort}}/>
    </RefreshContext.Provider>
  )
}
export default OcrViewerPage
