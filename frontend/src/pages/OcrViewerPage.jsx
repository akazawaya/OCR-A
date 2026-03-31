import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { pageAccessSpec, wordSpec } from "../appConfig";
import { getCollection } from "../api/clients/collectionClient";
import {
  postCollectionItem,
  deleteCollectionItem,
  patchCollectionItem,
} from "../api/clients/mutationClient";
import { usePrint } from "../logic/print/usePrint";
import { useRouting } from "../logic/routing/useRouting";
import { buildCollectionQueryString } from "../logic/server/buildCollectionQueryString";
import { useViewerPageState } from "../logic/ui/useViewerPageState";
import { ViewerProviders } from "../contexts/viewer/ViewerProviders";
import ViewerTopBar from "../components/Viewer/ViewerTopBar";
import ViewerImage from "../components/Viewer/ViewerImage/ViewerImage";
import ViewerTable from "../components/Viewer/ViewerTable";

const OcrViewerPage = () => {
  const queryClient = useQueryClient();
  const routing = useRouting({});
  const { search, primaryKey } = routing;

  const { collectionUrl: pageCollectionUrl } = pageAccessSpec;
  const pageQueryString = useMemo(
    () =>
      buildCollectionQueryString({
        baseSearch: search,
        extraParams: { doc: primaryKey },
      }),
    [search, primaryKey],
  );
  const pageQueryKey = useMemo(
    () => [pageCollectionUrl, pageQueryString],
    [pageCollectionUrl, pageQueryString],
  );

  const { collectionUrl: wordCollectionUrl } = wordSpec;
  const wordQueryString = useMemo(
    () =>
      buildCollectionQueryString({
        baseSearch: search,
        extraParams: { page__doc: primaryKey, doc: null },
      }),
    [search, primaryKey],
  );
  const wordsQueryKey = useMemo(
    () => [wordCollectionUrl, wordQueryString],
    [wordCollectionUrl, wordQueryString],
  );

  const { data: pages = [] } = useQuery({
    queryKey: pageQueryKey,
    queryFn: () =>
      getCollection({
        collectionUrl: pageCollectionUrl,
        queryString: pageQueryString,
      }),
    enabled: Boolean(pageCollectionUrl),
    placeholderData: [],
  });

  const { data: words = [] } = useQuery({
    queryKey: wordsQueryKey,
    queryFn: () =>
      getCollection({
        collectionUrl: wordCollectionUrl,
        queryString: wordQueryString,
      }),
    enabled: Boolean(wordCollectionUrl),
    placeholderData: [],
  });

  const wordTableColumns = wordSpec.ui.table.map(({ key, label }) => ({
    key,
    label,
  }));

  const pageState = useViewerPageState({ maxPage: pages.length });
  const { printRef, isPrintMode, openPrintDialog } = usePrint({
    pages,
    currentPage: pageState.page,
    documentTitle: "viewer-export",
  });

  const { mutate: postWordByBbox } = useMutation({
    mutationFn: async (wordPostInputs) => {
      for (const { pageId, bbox, direction } of wordPostInputs) {
        await postCollectionItem({
          collectionUrl: wordCollectionUrl,
          body: { page: pageId, bbox, direction },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: wordsQueryKey,
      });
    },
  });

  const { mutate: patchWordContentById } = useMutation({
    mutationFn: async (contentDraftById) => {
      const snapshot = { ...(contentDraftById ?? {}) };
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
        queryKey: wordsQueryKey,
      });
    },
  });

  const { mutate: deleteWordById } = useMutation({
    mutationFn: async (wordIds = []) => {
      for (const id of wordIds) {
        await deleteCollectionItem({
          collectionUrl: wordCollectionUrl,
          id,
        });
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: wordsQueryKey,
      }),
  });

  return (
    <ViewerProviders
      data={{ pages, words, wordsQueryKey }}
      mutations={{ postWordByBbox, patchWordContentById, deleteWordById }}
      pageState={pageState}
    >
      <div className="grid h-full grid-cols-[2fr_1fr] grid-rows-[auto_1fr] gap-2 overflow-hidden p-2">
        <div className="col-span-2">
          <ViewerTopBar events={{ onClickPrintButton: openPrintDialog }} />
        </div>
        <div className="overflow-auto overscroll-contain">
          <ViewerImage
            data={{ pages }}
            printRef={printRef}
            isPrintMode={isPrintMode}
          />
        </div>
        <div className="overflow-auto overscroll-contain">
          <ViewerTable
            data={{
              columns: wordTableColumns,
              rows: words,
            }}
            events={{
              onClickColumn: routing.columnsSort,
            }}
          />
        </div>
      </div>
    </ViewerProviders>
  );
};
export default OcrViewerPage;
