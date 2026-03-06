import { useMemo, useReducer } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { ViewerProviders } from "../contexts/viewer/ViewerProviders";
import { pageAccessSpec, wordSpec } from "../appConfig";
import { RefreshContext } from "../contexts/refreshContext";
import Viewer from "../components/Viewer/Viewer";
import { useRouting } from "../hooks/routing/useRouting";
import { getCollection } from "../api/clients/collectionClient";
import { buildSearch } from "../hooks/server/collectionQuery";
import { patchCollectionItem } from "../api/clients/mutationClient";
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
  const { data: pages = [] } = useQuery({
    queryKey: ["collection", pageCollectionUrl, pageSearch ?? ""],
    queryFn: () =>
      getCollection({ collectionUrl: pageCollectionUrl, search: pageSearch }),
    enabled: Boolean(pageCollectionUrl),
    placeholderData: [],
  });

  const { collectionUrl: wordCollectionUrl } = wordSpec;
  const { data: words = [], isLoading: wordRowsLoading } = useQuery({
    queryKey: ["collection", wordCollectionUrl, wordSearch ?? "", refresh],
    queryFn: () =>
      getCollection({ collectionUrl: wordCollectionUrl, search: wordSearch }),
    enabled: Boolean(wordCollectionUrl),
    placeholderData: [],
  });

  const wordSchema = wordSpec.ui.table.map(({ key, label }) => ({
    key,
    label,
  }));

  const { mutate: commitDraftById } = useMutation({
    mutationFn: async (draftById) => {
      const snapshot = { ...(draftById ?? {}) };
      const entries = Object.entries(snapshot);
      for (const [wordId, content] of entries) {
        await patchCollectionItem({
          collectionUrl: wordCollectionUrl,
          id: wordId,
          body: { content },
        });
      }
    },
  });

  // 下記Viewerのpropの渡し方は、インタフェース分離から言ってよくないが、明示のスタイルをとると
  //　Page-Viewer-Parts間の修正が必要になり大変なので特別に許容する
  // onClickColumnはViewerTable用
  return (
    <RefreshContext.Provider value={onRefresh}>
      <ViewerProviders data={{ pages, words }} mutations={{ commitDraftById }}>
        <Viewer
          data={{
            pages,
            words,
            wordSchema,
            loading: wordRowsLoading,
          }}
          events={{
            onClickColumn: routing.columnsSort,
          }}
        />
      </ViewerProviders>
    </RefreshContext.Provider>
  );
};
export default OcrViewerPage;
