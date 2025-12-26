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
  const { search, columnsSort, routingRowFilter } = useRouting({
    rowSelector: (row) => row.doc
  });
  const { dataUrl: pageDataUrl } = pageApiConfig;
  const pageRows = usePageRows(routingRowFilter, pageDataUrl, search);

  const { schemaUrl, schemaName, dataUrl: wordDataUrl } = wordApiConfig;
  const { columns, rows: wordRows, loading } = useTableData(routingRowFilter, schemaUrl, schemaName, wordDataUrl, search, refresh, onRefresh);

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
