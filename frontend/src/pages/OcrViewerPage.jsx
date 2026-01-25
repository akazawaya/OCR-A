import { useReducer } from "react"
import { RefreshContext } from "../contexts/refreshContext"
import { pageAccessSpec, wordSpec } from "../appConfig";
import Viewer from "../components/Viewer/Viewer";
import { useRouting } from "../hooks/routing/useRouting";
import { useMemo } from "react";
import { useBackendQuery } from "../hooks/server/query/useBackendQuery";
import { getCollection } from "../api/clients/collectionClient";
import { applyFilter } from "../hooks/server/query/queryUi";
// Pageが渡すのは server/のfetch経由のデータと、routing/のルート関連
const OcrViewerPage = () => {
  const [refresh, onRefresh] = useReducer(n => n + 1, 0);
  const routing = useRouting({});
  const { search, primaryKey, buildSearch, routingRowFilter } = routing;

  const pageSearch = primaryKey != null ? buildSearch({ doc: primaryKey }) : search;
  const wordSearch = primaryKey != null ? buildSearch({ page__doc: primaryKey, doc: null }) : search;

  const { collectionUrl: pageCollectionUrl } = pageAccessSpec;

  const { data: pageRowsRaw } = useBackendQuery({
    queryKey: ["collection", pageCollectionUrl, pageSearch ?? ""],
    queryFn: () => getCollection({ collectionUrl: pageCollectionUrl, search: pageSearch }),
    enabled: Boolean(pageCollectionUrl),
    initialData: [],
  });

  const pageRows = useMemo(
    () => applyFilter(pageRowsRaw, routingRowFilter), 
    [pageRowsRaw, routingRowFilter]
  );

  const { collectionUrl: wordCollectionUrl } = wordSpec;
  const { data: wordRows, isLoading: wordRowsLoading } = useBackendQuery({
    queryKey: ["collection", wordCollectionUrl, wordSearch ?? "", refresh],
    queryFn: () => getCollection({ collectionUrl: wordCollectionUrl, search: wordSearch }),
    enabled: Boolean(wordCollectionUrl),
    initialData: [],
  });
  const wordColumns = wordSpec.ui.table.map(({ key, label }) => ({ key, label }));

  // 下記Viewerのpropの渡し方は、インタフェース分離から言ってよくないが、明示のスタイルをとると
  //　Page-Viewer-Parts間の修正が必要になり大変なので特別に許容する
  // onClickColumnはViewerTable用
  return (
    <RefreshContext.Provider value={onRefresh}>
      <Viewer
        pageRows = { pageRows }
        wordRows = { wordRows }
        wordColumns = { wordColumns }
        loading = { wordRowsLoading }
        onClickColumn = { routing.columnsSort }
      />
    </RefreshContext.Provider>
  )
}
export default OcrViewerPage
