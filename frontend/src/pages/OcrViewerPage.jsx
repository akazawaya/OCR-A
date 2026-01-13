import { useReducer } from "react"
import { RefreshContext } from "../contexts/refreshContext"
import { pageApiConfig, wordConfig } from "../route";
import Viewer from "../components/Viewer/Viewer";
import { useTableData } from "../hooks/server/useTableData";
import { usePageRows } from "../hooks/server/usePageRows";
import { useRouting } from "../hooks/routing/useRouting";
import { useViewerPageState } from "../hooks/ui/useViewerPageState";
import { useViewerWordState } from "../hooks/ui/useViewerWordState";

//　useParams の返り値は文字列になるのでNumber()で変換しておく

const OcrViewerPage = () => {
  const [refresh, onRefresh] = useReducer(n => n + 1, 0);
  const routing = useRouting({});
  const { search, primaryKey, buildSearch } = routing;


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
  const viewerPageState  = useViewerPageState({ maxPage:pageRows.length });
  const viewerWordState = useViewerWordState(pageData, wordData);
  // 下記Viewerのpropの渡し方は、インタフェース分離から言ってよくないが、明示のスタイルをとると
  //　Page-Viewer-Parts間の修正が必要になり大変なので特別に許容する
  return (
    <RefreshContext.Provider value={onRefresh}>
      <Viewer
        pageData = { pageData }
        wordData = { wordData }
        viewerPageState = { viewerPageState }
        viewerWordState = { viewerWordState }
        navigation = { routing }
      />
    </RefreshContext.Provider>
  )
}
export default OcrViewerPage
