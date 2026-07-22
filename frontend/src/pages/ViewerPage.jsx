import { useMemo, useRef, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBlocker, useLocation, useParams } from "react-router-dom";

import {
  documentAccessSpec,
  pageAccessSpec,
  wordSpec,
  wordOcrAccessSpec,
  OCR_WS_URL,
} from "../appConfig";
import {
  getCollectionItem,
  getCollection,
  getPreviewWordOcrResult,
} from "../api/clients/collectionClient";
import {
  postCollection,
  deleteCollectionItem,
  patchCollectionItem,
  ocrPreviewWord,
} from "../api/clients/mutationClient";
import { usePrint } from "../logic/print/usePrint";
import { buildCollectionQueryString } from "../logic/urlQuery/buildCollectionQueryString";
import { useViewerPageState } from "../logic/viewer/useViewerPageState";
import { sortViewerWords } from "../logic/viewer/sortViewerWords";
import { useSelection } from "../logic/layout/useSelection";
import { useViewerEditState } from "../logic/viewer/useViewerEditState";
import { normalizePreviewWordOcrJobResult } from "../logic/viewer/previewWordOcrContract";
import ViewerTopBar from "../components/Viewer/ViewerTopBar";
import ViewerImage from "../components/Viewer/ViewerImage/ViewerImage";
import ViewerTable from "../components/Viewer/ViewerTable";
import { ViewerEditHotkeys } from "../components/Viewer/ViewerEditHotkeys";
import AlertDialog from "../components/ui/AlertDialog";

const ViewerPage = () => {
  const queryClient = useQueryClient();
  const { search } = useLocation();
  // この search はURIの?以降のqueryString全体のため、searchQueryと混同しないように注意
  const { primaryKey } = useParams();

  const { collectionUrl: documentCollectionUrl } = documentAccessSpec;
  const documentQueryKey = useMemo(
    () => [documentCollectionUrl, primaryKey],
    [documentCollectionUrl, primaryKey],
  );

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

  const {
    data: document = [], // documentTitleのためにガード追加
    isPending: isDocumentsPending,
    isError: isDocumentsError,
  } = useQuery({
    queryKey: documentQueryKey,
    queryFn: () =>
      getCollectionItem({
        collectionUrl: documentCollectionUrl,
        id: primaryKey,
      }),
    enabled: Boolean(documentCollectionUrl),
  });

  const {
    data: pages = [], //maxPage: pages.lengthのためにpagesはガードを追加
    isPending: isPagesPending,
    isError: isPagesError,
  } = useQuery({
    queryKey: pageQueryKey,
    queryFn: () =>
      getCollection({
        collectionUrl: pageCollectionUrl,
        queryString: pageQueryString,
      }),
    enabled: Boolean(pageCollectionUrl),
  });

  const {
    data: words,
    isPending: isWordsPending,
    isError: isWordsError,
  } = useQuery({
    queryKey: wordsQueryKey,
    queryFn: () =>
      getCollection({
        collectionUrl: wordCollectionUrl,
        queryString: wordQueryString,
      }),
    enabled: Boolean(wordCollectionUrl),
    refetchOnWindowFocus: false,
  });

  const isPending = isDocumentsPending || isPagesPending || isWordsPending;
  const isError = isDocumentsError || isPagesError || isWordsError;
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
  const contentRef = useRef(null);
  const { isPrintMode, openPrintDialog } = usePrint({
    contentRef,
    pages,
    currentPage: pageState.page,
    documentTitle: `電子化出力_${document.file_name}`,
  });

  const { mutate: postWordMutation } = useMutation({
    mutationFn: async (wordPostInputs) => {
      for (const { pageId, bbox, direction, content } of wordPostInputs) {
        await postCollection({
          collectionUrl: wordCollectionUrl,
          body: { page: pageId, bbox, direction, content },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: wordsQueryKey,
      });
    },
  });

  const { mutate: patchWordMutation } = useMutation({
    mutationFn: async (wordPatchInputs) => {
      const snapshot = { ...(wordPatchInputs ?? {}) };
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

  const { mutate: deleteWordMutation } = useMutation({
    mutationFn: async (wordDeleteIds = []) => {
      for (const id of wordDeleteIds) {
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

  // ここからOCR関連
  const pendingPreviewJobIdsRef = useRef(new Set());
  const [previewJob, setPreviewJob] = useState(null);
  const { mutateAsync: ocrPreviewWordMutation } = useMutation({
    mutationFn: ({ previewWord, mode }) =>
      ocrPreviewWord({
        actionUrl: wordOcrAccessSpec.actionUrl,
        previewWord,
        mode,
        doc: primaryKey,
      }),
    onSuccess: (previewJobId) => {
      pendingPreviewJobIdsRef.current.add(previewJobId);
    },
  });

  useEffect(() => {
    const ws = new WebSocket(OCR_WS_URL);
    ws.onmessage = async (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type !== "preview_word_ocr_changed") return;
      const previewJobId = payload.preview_job_id;
      if (!pendingPreviewJobIdsRef.current.has(previewJobId)) return;
      try {
        const _previewJob = await queryClient.fetchQuery({
          queryKey: [previewJobId],
          queryFn: () =>
            getPreviewWordOcrResult({
              previewJobId,
            }),
        });
        setPreviewJob(
          normalizePreviewWordOcrJobResult({
            ..._previewJob,
            preview_job_id: previewJobId,
          }),
        );
      } finally {
        pendingPreviewJobIdsRef.current.delete(previewJobId);
      }
    };
    return () => ws.close();
  }, [queryClient]);

  const editState = useViewerEditState({
    postWordMutation,
    patchWordMutation,
    deleteWordMutation,
    ocrPreviewWordMutation,
    wordsQueryKey,
    pageNumberByPageId,
    previewJob,
  });
  const blocker = useBlocker(editState.isEditMode);

  return (
    <>
      <AlertDialog.Root
        open={blocker.state === "blocked"}
        onOpenChange={(open) => {
          if (!open && blocker.state === "blocked") blocker.reset();
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay />
          <AlertDialog.Content>
            <AlertDialog.Title>編集を中止して移動しますか？</AlertDialog.Title>
            <AlertDialog.Description>
              編集中の内容は保存されません。
            </AlertDialog.Description>
            <div className="mt-6 flex justify-end gap-2">
              <AlertDialog.Cancel>編集を続ける</AlertDialog.Cancel>
              <AlertDialog.Action
                onClick={(event) => {
                  event.preventDefault();
                  if (blocker.state === "blocked") blocker.proceed();
                }}
              >
                破棄して続ける
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
      <ViewerEditHotkeys
        data={{}}
        events={{
          onKeyDownUndo: editState.undo,
          onKeyDownRedo: editState.redo,
        }}
      />
      <div className="grid h-full grid-cols-[2fr_1fr] grid-rows-[auto_1fr] gap-2 overflow-hidden p-2">
        <div className="col-span-2">
          <ViewerTopBar
            data={{
              maxPage: pages.length,
              page: pageState.page,
              zoom: pageState.zoom,
              rotate: pageState.rotate,
              isEditMode: editState.isEditMode,
              canUndo: editState.canUndo,
              canRedo: editState.canRedo,
              canGoPrevPage: pageState.canGoPrevPage,
              canGoNextPage: pageState.canGoNextPage,
              canZoomOut: pageState.canZoomOut,
              canZoomIn: pageState.canZoomIn,
              isOcring: editState.isOcring,
              isPrintMode,
            }}
            events={{
              onClickPrintButton: openPrintDialog,
              onClickEditButton: editState.startEdit,
              onClickUndoButton: editState.undo,
              onClickRedoButton: editState.redo,
              onClickSaveButton: editState.saveEdit,
              onClickCancelButton: editState.cancelEdit,
              onClickPageStepButton: pageState.setPage,
              onClickZoomStepButton: pageState.setZoom,
              onClickRotateStepButton: pageState.setRotate,
              onEnterPageInput: pageState.commitPage,
              onEnterZoomInput: pageState.commitZoom,
              onEnterRotateInput: pageState.commitRotate,
            }}
          />
        </div>
        {isPending ? (
          <div>Now Loading...</div>
        ) : isError ? (
          <div>読み込みに失敗しました</div>
        ) : (
          <>
            <div className="scrollbar-gutter-stable overflow-auto overscroll-contain">
              <ViewerImage
                data={{
                  pages,
                  isPrintMode,
                  page: pageState.page,
                  contentRef,
                  rotate: pageState.rotate,
                  zoom: pageState.zoom,
                  selectedId: selection.selectedId,
                  selectedBy: selection.selectedBy,
                }}
                wordOverlayData={{
                  words: sortedWords,
                  hoveredWordId: selection.hoveredId,
                  selectedWordId: selection.selectedId,
                  isEditMode: editState.isEditMode,
                  isDragRectDisabled: editState.isOcring,
                }}
                wordOverlayEvents={{
                  onHoverWord: selection.hover,
                  onHoverClearWord: selection.clearHovered,
                  onSelectWord: selection.commitSelect,
                  onBboxDrawComplete: editState.addPendingPostByBbox,
                }}
              />
            </div>
            <div className="overflow-auto overscroll-contain">
              <ViewerTable
                data={{
                  columns: wordTableColumns,
                  rows: sortedWords,
                  page: pageState.page,
                  hoveredId: selection.hoveredId,
                  selectedId: selection.selectedId,
                  selectedBy: selection.selectedBy,
                  isEditMode: editState.isEditMode,
                  isOcring: editState.isOcring,
                }}
                events={{
                  onChangeContentDraft: editState.changeContentDraftById,
                  onClickDeleteButton: editState.addPendingDeleteById,
                  onClickOcrReplaceButton: editState.replacePreviewWordByOcr,
                  onClickOcrRewriteButton:
                    editState.rewritePreviewWordContentByOcr,
                  onHover: selection.hover,
                  onHoverClear: selection.clearHovered,
                  onSelect: selection.commitSelect,
                }}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
};
export default ViewerPage;
