import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { pageAccessSpec, wordSpec } from "../appConfig";
import { getCollection } from "../api/clients/collectionClient";
import { patchCollectionItem } from "../api/clients/mutationClient";
import { useRouting } from "../logic/routing/useRouting";
import { buildCollectionQueryString } from "../logic/server/buildCollectionQueryString";
import { ViewerProviders } from "../contexts/viewer/ViewerProviders";
import ViewerTopBar from "../components/Viewer/ViewerTopbar";
import ViewerImage from "../components/Viewer/ViewerImage/ViewerImage";
import ViewerTable from "../components/Viewer/ViewerTable";

const OcrViewerPage = () => {
  const queryClient = useQueryClient();
  const routing = useRouting({});
  const { search, primaryKey } = routing;

  const pageQueryString = useMemo(
    () =>
      buildCollectionQueryString({
        baseSearch: search,
        extraParams: { doc: primaryKey },
      }),
    [search, primaryKey],
  );
  const wordQueryString = useMemo(
    () =>
      buildCollectionQueryString({
        baseSearch: search,
        extraParams: { page__doc: primaryKey, doc: null },
      }),
    [search, primaryKey],
  );

  const { collectionUrl: pageCollectionUrl } = pageAccessSpec;
  const { data: pages = [] } = useQuery({
    queryKey: [pageCollectionUrl, pageQueryString],
    queryFn: () =>
      getCollection({
        collectionUrl: pageCollectionUrl,
        queryString: pageQueryString,
      }),
    enabled: Boolean(pageCollectionUrl),
    placeholderData: [],
  });

  const { collectionUrl: wordCollectionUrl } = wordSpec;
  const { data: words = [] } = useQuery({
    queryKey: [wordCollectionUrl, wordQueryString],
    queryFn: () =>
      getCollection({
        collectionUrl: wordCollectionUrl,
        queryString: wordQueryString,
      }),
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
        queryKey: [wordCollectionUrl, wordQueryString],
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
