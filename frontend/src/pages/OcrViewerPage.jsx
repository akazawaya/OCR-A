import { useMemo, useReducer } from "react";
import { useQuery } from "@tanstack/react-query";

import { RefreshContext } from "../contexts/refreshContext";
import { pageAccessSpec, wordSpec } from "../appConfig";
import Viewer from "../components/Viewer/Viewer";
import { useRouting } from "../hooks/routing/useRouting";
import { getCollection } from "../api/clients/collectionClient";
import { buildSearch } from "../hooks/server/collectionQuery";
// Pageが渡すのは server/のfetch経由のデータと、routing/のルート関連
const OcrViewerPage = () => {
  const [refresh, onRefresh] = useReducer((n) => n + 1, 0);
  const routing = useRouting({});
  const { search, primaryKey } = routing;

  const pageSearch = useMemo(
    () => buildSearch({ baseSearch: search, routing: { doc: primaryKey } }),
    [search, primaryKey],
  );
  const wordSearch = useMemo(
    () =>
      buildSearch({
        baseSearch: search,
        routing: { page__doc: primaryKey, doc: null },
      }),
    [search, primaryKey],
  );

  const { collectionUrl: pageCollectionUrl } = pageAccessSpec;
  const { data: pageRows = [] } = useQuery({
    queryKey: ["collection", pageCollectionUrl, pageSearch ?? ""],
    queryFn: () =>
      getCollection({ collectionUrl: pageCollectionUrl, search: pageSearch }),
    enabled: Boolean(pageCollectionUrl),
    placeholderData: [],
  });

  const { collectionUrl: wordCollectionUrl } = wordSpec;
  const { data: wordRows = [], isLoading: wordRowsLoading } = useQuery({
    queryKey: ["collection", wordCollectionUrl, wordSearch ?? "", refresh],
    queryFn: () =>
      getCollection({ collectionUrl: wordCollectionUrl, search: wordSearch }),
    enabled: Boolean(wordCollectionUrl),
    placeholderData: [],
  });
  const wordColumns = wordSpec.ui.table.map(({ key, label }) => ({
    key,
    label,
  }));

  // 下記Viewerのpropの渡し方は、インタフェース分離から言ってよくないが、明示のスタイルをとると
  //　Page-Viewer-Parts間の修正が必要になり大変なので特別に許容する
  // onClickColumnはViewerTable用
  return (
    <RefreshContext.Provider value={onRefresh}>
      <Viewer
        pageRows={pageRows}
        wordRows={wordRows}
        wordColumns={wordColumns}
        loading={wordRowsLoading}
        onClickColumn={routing.columnsSort}
      />
    </RefreshContext.Provider>
  );
};
export default OcrViewerPage;
