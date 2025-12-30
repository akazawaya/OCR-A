import { useReducer } from "react"
import { RefreshContext } from "../contexts/refreshContext"
import { pageApiConfig, wordConfig } from "../route";
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
  const pageRows = usePageRows({ dataUrl: pageDataUrl, search: pageSearch });

  const { schemaUrl, schemaName, dataUrl: wordDataUrl } = wordConfig;
  const { rows: wordRows, loading } = useTableData({
    schemaUrl,
    schemaName,
    dataUrl: wordDataUrl,
    search: wordSearch,
    refresh,
    onRefresh,
  });
  const wordColumns = wordConfig.ui.table.map(({ key, label }) => ({ key, label }));

  const pageData = { rows: pageRows };
  const wordData = { columns: wordColumns, rows: wordRows, loading };
  const viewer = useViewer({ maxPage:pageRows.length });

  return (
    <RefreshContext.Provider value={onRefresh}>
      <p>OcrViewerPage</p>
      <Viewer
        pageData={ pageData }
        wordData={ wordData }
        viewer={ viewer }
        navigation={{onColumnClick:columnsSort}}/>
    </RefreshContext.Provider>
  )
}
export default OcrViewerPage
