import { useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "react-router-dom";

import { pageAccessSpec, wordSpec } from "../appConfig";
import { getCollection } from "../api/clients/collectionClient";
import {
  postCollectionItem,
  deleteCollectionItem,
  patchCollectionItem,
} from "../api/clients/mutationClient";
import { usePrint } from "../logic/print/usePrint";
import { buildCollectionQueryString } from "../logic/urlQuery/buildCollectionQueryString";
import { useViewerPageState } from "../logic/viewer/useViewerPageState";
import { sortViewerWords } from "../logic/viewer/sortViewerWords";
import { useSelection } from "../logic/layout/useSelection";
import { useViewerEditState } from "../logic/viewer/useViewerEditState";
import ViewerTopBar from "../components/Viewer/ViewerTopBar";
import ViewerImage from "../components/Viewer/ViewerImage/ViewerImage";
import ViewerTable from "../components/Viewer/ViewerTable";
import { ViewerEditHotkeys } from "../components/Viewer/ViewerEditHotkeys";

const ViewerPage = () => {
  const queryClient = useQueryClient();
  const { search } = useLocation();
  // この search はURIの?以降のqueryString全体のため、searchQueryと混同しないように注意
  const { primaryKey } = useParams();

  const { collectionUrl: pageCollectionUrl } = pageAccessSpec;
  const pageQueryString = useMemo(
    () =>
      buildCollectionQueryString({
        baseQueryString: search,
        routingQuery: { doc: primaryKey },
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
        baseQueryString: search,
        routingQuery: { page__doc: primaryKey, doc: null },
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
  const sortedWords = useMemo(
    () => sortViewerWords({ words, pages }),
    [words, pages],
  );
  const pageNumberByPageId = useMemo(() => {
    return new Map(pages.map((page) => [String(page.id), page.page_number]));
  }, [pages]);

  const wordTableColumns = wordSpec.ui.table.map(({ key, label }) => ({
    key,
    label,
  }));

  const pageState = useViewerPageState({ maxPage: pages.length });
  const selection = useSelection();
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

  const editState = useViewerEditState({
    postWordByBbox,
    patchWordContentById,
    deleteWordById,
    wordsQueryKey,
    pageNumberByPageId,
  });

  const viewerRootRef = useRef(null);
  return (
    <>
      <ViewerEditHotkeys
        editEvents={{
          onKeyDownUndo: editState.undo,
          onKeyDownRedo: editState.redo,
        }}
        editState={{ isEditing: editState.isEditing }}
        viewerRootRef={viewerRootRef}
      />
      <div className="grid h-full grid-cols-[2fr_1fr] grid-rows-[auto_1fr] gap-2 overflow-hidden p-2">
        <div className="col-span-2">
          <ViewerTopBar
            editEvents={{
              onClickEditButton: editState.startEdit,
              onClickSaveButton: editState.saveEdit,
              onClickCancelButton: editState.cancelEdit,
            }}
            editState={{ isEditing: editState.isEditing }}
            events={{ onClickPrintButton: openPrintDialog }}
            maxPage={pages.length}
            pageEvents={{
              onClickPageStepButton: pageState.setPage,
              onClickZoomStepButton: pageState.setZoom,
              onClickRotateStepButton: pageState.setRotate,
              onEnterPageInput: pageState.commitPage,
              onEnterZoomInput: pageState.commitZoom,
              onEnterRotateInput: pageState.commitRotate,
            }}
            pageState={{
              page: pageState.page,
              zoom: pageState.zoom,
              rotate: pageState.rotate,
              ZOOM_STEP: pageState.ZOOM_STEP,
              ROTATE_STEP: pageState.ROTATE_STEP,
            }}
          />
        </div>
        <div className="overflow-auto overscroll-contain [scrollbar-gutter:stable]">
          <ViewerImage
            data={{ pages }}
            isPrintMode={isPrintMode}
            page={pageState.page}
            printRef={printRef}
            rotate={pageState.rotate}
            selectionState={{
              hoveredId: selection.hoveredId,
              selectedId: selection.selectedId,
              selectedBy: selection.selectedBy,
            }}
            wordOverlayEvents={{
              onHoverWord: selection.hover,
              onHoverClearWord: selection.clearHovered,
              onSelectWord: selection.commitSelect,
              onAddPendingPostByBbox: editState.addPendingPostByBbox,
            }}
            wordOverlayState={{
              words: sortedWords,
              hoveredWordId: selection.hoveredId,
              selectedWordId: selection.selectedId,
              isEditing: editState.isEditing,
              pendingDeleteIdSet: editState.pendingDeleteIdSet,
            }}
            zoom={pageState.zoom}
          />
        </div>
        <div className="overflow-auto overscroll-contain">
          <ViewerTable
            data={{
              columns: wordTableColumns,
              rows: sortedWords,
            }}
            editEvents={{
              onChangeContentDraft: editState.changeContentDraftById,
              onClickDeleteButton: editState.togglePendingDeleteId,
            }}
            editState={{
              isEditing: editState.isEditing,
              contentDraftById: editState.contentDraftById,
              pendingDeleteIdSet: editState.pendingDeleteIdSet,
            }}
            page={pageState.page}
            selectionEvents={{
              onHover: selection.hover,
              onHoverClear: selection.clearHovered,
              onSelect: selection.commitSelect,
            }}
            selectionState={{
              hoveredId: selection.hoveredId,
              selectedId: selection.selectedId,
              selectedBy: selection.selectedBy,
            }}
          />
        </div>
      </div>
    </>
  );
};
export default ViewerPage;
