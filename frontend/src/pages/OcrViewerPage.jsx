import { useReducer } from "react"
import { RefreshContext } from "../contexts/refreshContext"
import { pageApiConfig, wordConfig } from "../route";
import Viewer from "../components/Viewer/Viewer";
import { useRouting } from "../hooks/routing/useRouting";
import { useTableData } from "../hooks/server/useTableData";
import { usePageRows } from "../hooks/server/usePageRows";

// Pageが渡すのは server/のfetch経由のデータと、routing/のルート関連
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
    schemaUrl, schemaName,
    dataUrl: wordDataUrl,
    search: wordSearch,
    refresh, onRefresh,
  });
  const wordColumns = wordConfig.ui.table.map(({ key, label }) => ({ key, label }));

  // 下記Viewerのpropの渡し方は、インタフェース分離から言ってよくないが、明示のスタイルをとると
  //　Page-Viewer-Parts間の修正が必要になり大変なので特別に許容する
  // onColumnClickはViewerTable用
  return (
    <RefreshContext.Provider value={onRefresh}>
      <Viewer
        pageRows = { pageRows }
        wordRows = { wordRows }
        wordColumns = { wordColumns }
        loading = { loading }
        onColumnClick = { routing.columnsSort }
      />
    </RefreshContext.Provider>
  )
}
export default OcrViewerPage
