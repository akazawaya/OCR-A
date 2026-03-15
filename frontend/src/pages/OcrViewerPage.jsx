import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import ViewerImage from "../components/Viewer/ViewerImage/ViewerImage";
import ViewerTopBar from "../components/Viewer/ViewerTopbar";
import { ViewerProviders } from "../contexts/viewer/ViewerProviders";
import { pageAccessSpec, wordSpec } from "../appConfig";
import { useRouting } from "../hooks/routing/useRouting";
import { getCollection } from "../api/clients/collectionClient";
import { buildSearch } from "../hooks/server/collectionQuery";
import { patchCollectionItem } from "../api/clients/mutationClient";
import ViewerTable from "../components/Viewer/ViewerTable";
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
  const { data: words = [] } = useQuery({
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
      <div className="grid h-full grid-cols-[2fr_1fr] grid-rows-[auto_1fr] gap-2 overflow-hidden p-2">
        <div className="col-span-2">
          <ViewerTopBar />
        </div>
        <div className="overflow-auto overscroll-contain">
          <ViewerImage data={{ pages }} />
        </div>
        <div className="overflow-auto overscroll-contain">
          <ViewerTable
            data={{
              columns: wordSchema,
              rows: words,
            }}
            events={{ onClickColumn: routing.columnsSort }}
          />
        </div>
      </div>
    </ViewerProviders>
  );
};
export default OcrViewerPage;
