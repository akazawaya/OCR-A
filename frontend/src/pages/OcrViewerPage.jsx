import { useReducer } from "react"
import { RefreshContext } from "../contexts/refreshContext"
import { pageApiConfig } from "../route";
import Viewer from "../components/Viewer/Viewer";
import { useRouting } from "../hooks/useRouting";
import { useTableData } from "../hooks/useTableData";
import { useViewer } from "../hooks/useViewer";
//　useParams の返り値は文字列になるのでNumber()で変換しておく

const OcrViewerPage = () => {
  const [refresh, onRefresh] = useReducer(n => n + 1, 0);
  const { search, columnsSort, routingRowFilter } = useRouting({
    rowSelector: (row) => row.doc
  });
  const { schemaUrl, schemaName, dataUrl } = pageApiConfig;
  const { columns, rows, loading } = useTableData(routingRowFilter, schemaUrl, schemaName, dataUrl, search, refresh, onRefresh);

  const viewer = useViewer();

  return (
    <RefreshContext.Provider value={onRefresh}>
      <p>OcrViewerPage</p>
      <Viewer
        data={{ columns, rows, loading }}
        viewer={viewer}
        navigation={{onColumnClick:columnsSort}}/>
    </RefreshContext.Provider>
  )
}
export default OcrViewerPage
