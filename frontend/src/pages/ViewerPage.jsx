import { useMemo, useRef } from "react";
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
import { useSelection } from "../logic/layout/useSelection";
import { useViewerEditState } from "../logic/ui/useViewerEditState";
import { useDragRectState } from "../logic/drag/useDragRectState";
import ViewerTopBar from "../components/Viewer/ViewerTopBar";
import ViewerImage from "../components/Viewer/ViewerImage/ViewerImage";
import ViewerTable from "../components/Viewer/ViewerTable";
import { ViewerEditHotkeys } from "../components/Viewer/ViewerEditHotkeys";

const ViewerPage = () => {
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
  });
  const dragRectState = useDragRectState();

  const viewerRootRef = useRef(null);
  return (
    <>
      <ViewerEditHotkeys
        viewerRootRef={viewerRootRef}
        editState={{ isEditing: editState.isEditing }}
        editEvents={{
          onKeyDownUndo: editState.undo,
          onKeyDownRedo: editState.redo,
        }}
      />
      <div className="grid h-full grid-cols-[2fr_1fr] grid-rows-[auto_1fr] gap-2 overflow-hidden p-2">
        <div className="col-span-2">
          <ViewerTopBar
            events={{ onClickPrintButton: openPrintDialog }}
            pageState={{
              page: pageState.page,
              zoom: pageState.zoom,
              rotate: pageState.rotate,
              ZOOM_STEP: pageState.ZOOM_STEP,
              ROTATE_STEP: pageState.ROTATE_STEP,
            }}
            pageEvents={{
              onClickPageStepButton: pageState.setPage,
              onClickZoomStepButton: pageState.setZoom,
              onClickRotateStepButton: pageState.setRotate,
              onEnterPageInput: pageState.commitPage,
              onEnterZoomInput: pageState.commitZoom,
              onEnterRotateInput: pageState.commitRotate,
            }}
            editState={{ isEditing: editState.isEditing }}
            editEvents={{
              onClickEditButton: editState.startEdit,
              onClickSaveButton: editState.saveEdit,
              onClickCancelButton: editState.cancelEdit,
            }}
          />
        </div>
        <div className="overflow-auto overscroll-contain">
          <ViewerImage
            data={{ pages }}
            printRef={printRef}
            isPrintMode={isPrintMode}
            page={pageState.page}
            zoom={pageState.zoom}
            rotate={pageState.rotate}
            selectionState={{
              hoveredId: selection.hoveredId,
              selectedId: selection.selectedId,
              selectedBy: selection.selectedBy,
            }}
            wordOverlayState={{
              words,
              hoveredWordId: selection.hoveredId,
              selectedWordId: selection.selectedId,
              isEditing: editState.isEditing,
              pendingDeleteIdSet: editState.pendingDeleteIdSet,
              draftRect: dragRectState.data.draftRect,
            }}
            wordOverlayEvents={{
              onHoverWord: selection.hover,
              onHoverClearWord: selection.clearHovered,
              onSelectWord: selection.commitSelect,
              onAddPendingPostByBbox: editState.addPendingPostByBbox,
              startDrag: dragRectState.events.startDrag,
              moveDrag: dragRectState.events.moveDrag,
              endDrag: dragRectState.events.endDrag,
              cancelDrag: dragRectState.events.cancelDrag,
            }}
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
            page={pageState.page}
            selectionState={{
              hoveredId: selection.hoveredId,
              selectedId: selection.selectedId,
              selectedBy: selection.selectedBy,
            }}
            selectionEvents={{
              onHover: selection.hover,
              onHoverClear: selection.clearHovered,
              onSelect: selection.commitSelect,
            }}
            editState={{
              isEditing: editState.isEditing,
              contentDraftById: editState.contentDraftById,
              pendingDeleteIdSet: editState.pendingDeleteIdSet,
            }}
            editEvents={{
              onChangeContentDraft: editState.changeContentDraftById,
              onClickDeleteButton: editState.togglePendingDeleteId,
            }}
          />
        </div>
      </div>
    </>
  );
};
export default ViewerPage;
