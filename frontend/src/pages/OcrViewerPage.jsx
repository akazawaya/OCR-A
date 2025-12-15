import { useReducer } from "react"
import { RefreshContext } from "../contexts/refreshContext"
import { pageApiConfig } from "../route";
import Viewer from "../components/Viewer/Viewer";
import { useRouting } from "../hooks/useRouting";
import { useTableData } from "../hooks/useTableData";
import { useViewer } from "../hooks/useViewer";
//　useParams の返り値は文字列になるのでNumber()で変換しておく

const OcrViewerPage = () =>{
  const [refresh, onRefresh] = useReducer(n => n + 1, 0);
  const { search, columnsSort, routingRowFilter } = useRouting({
    rowSelector: (row) => row.doc
  });
  const { schemaUrl, schemaName, dataUrl } = pageApiConfig;
  const { loading, rows, imgs } = useViewer(dataUrl, search, refresh);
  // 現状はuseTableDataにてrowsの取得を兼ねているが、useViewerにfetchを寄せて、組み立て専用としても機能するように改造する予定
  // loadingは連携が二つのhooksでとれるか？を検討しつつ使用方法を決める予定
  const { columns } = useTableData(schemaUrl, schemaName, dataUrl, search, rows, refresh, onRefresh);

  return (
    <RefreshContext.Provider value={onRefresh}>
      <p>OcrViewerPage</p>
      <Viewer
        data={{ columns, rows, loading, imgs }}
        navigation={{onColumnClick:columnsSort}}
        options={{onDataRouting:routingRowFilter}}/>
    </RefreshContext.Provider>
  )
}
export default OcrViewerPage
