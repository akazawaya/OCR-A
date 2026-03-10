import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import ViewerImage from "../components/Viewer/ViewerImage/ViewerImage";
import styles from "../components/Viewer/Viewer.module.css";
import ViewerTopBar from "../components/Viewer/ViewerTopbar/ViewerTopbar";
import ViewerTable from "../components/Viewer/VIewerTable/ViewerTable";
import { ViewerProviders } from "../contexts/viewer/ViewerProviders";
import { pageAccessSpec, wordSpec } from "../appConfig";
import { useRouting } from "../hooks/routing/useRouting";
import { getCollection } from "../api/clients/collectionClient";
import { buildSearch } from "../hooks/server/collectionQuery";
import { patchCollectionItem } from "../api/clients/mutationClient";
// Pageが渡すのは server/のfetch経由のデータと、routing/のルート関連
const OcrViewerPage = () => {
  const queryClient = useQueryClient();
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
    queryKey: [pageCollectionUrl, pageSearch],
    queryFn: () =>
      getCollection({ collectionUrl: pageCollectionUrl, search: pageSearch }),
    enabled: Boolean(pageCollectionUrl),
    placeholderData: [],
  });

  const { collectionUrl: wordCollectionUrl } = wordSpec;
  const { data: words = [], isLoading: wordRowsLoading } = useQuery({
    queryKey: [wordCollectionUrl, wordSearch],
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [wordCollectionUrl, wordSearch],
      });
    },
  });

  return (
    <ViewerProviders data={{ pages, words }} mutations={{ commitDraftById }}>
      <div className={styles.viewerRoot}>
        <ViewerTopBar />
        <div className={styles.viewerContent}>
          <div className={styles.imagePane}>
            <ViewerImage data={{ pages }} />
          </div>
          <div className={styles.tablePane}>
            <ViewerTable
              data={{
                columns: wordSchema,
                rows: words,
                loading: wordRowsLoading,
              }}
              events={{ onClickColumn: routing.columnsSort }}
            />
          </div>
        </div>
      </div>
    </ViewerProviders>
  );
};
export default OcrViewerPage;
