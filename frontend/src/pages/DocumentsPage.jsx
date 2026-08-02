import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { toastStyles } from "../components/ui/toastStyles";
import {
  documentOcrAccessSpec,
  documentSpec,
  routePaths,
  OCR_WS_URL,
} from "../appConfig";
import { getCollection } from "../api/clients/collectionClient";
import {
  postFormData,
  deleteCollectionItem,
} from "../api/clients/mutationClient";
import { buildCollectionQueryString } from "../logic/urlQuery/buildCollectionQueryString";
import { defaultSearchQuery } from "../logic/urlQuery/searchQueryUtils";
import { toggleSortQuery } from "../logic/urlQuery/sortQueryUtils";
import { useSearchQuery } from "../logic/urlQuery/useSearchQuery";
import DocumentToolbar from "../components/Document/DocumentToolbar";
import DocumentTable from "../components/Document/DocumentTable";
import AlertDialog from "../components/ui/AlertDialog";

const DocumentsPage = () => {
  const navigate = useNavigate();
  const { search: baseQueryString } = useLocation();
  const queryClient = useQueryClient();
  const { collectionUrl } = documentSpec;
  const { actionUrl: documentOcrActionUrl } = documentOcrAccessSpec;
  const {
    searchQuery: draftSearchQuery,
    updateSearchQuery,
    resetSearchQuery,
  } = useSearchQuery();

  const [appliedSortQuery, setAppliedSortQuery] = useState({ ordering: "" });
  const [appliedSearchQuery, setAppliedSearchQuery] =
    useState(draftSearchQuery);
  const [documentToDelete, setDocumentToDelete] = useState(null);

  const dataRouter = useCallback(
    (resource) => navigate(routePaths.viewer.to(resource.id)),
    [navigate],
  );

  const columnsSort = useCallback(
    (orderingField) => {
      const nextAppliedSortQuery = toggleSortQuery(
        appliedSortQuery,
        orderingField,
      );
      setAppliedSortQuery(nextAppliedSortQuery);

      const nextQueryString = buildCollectionQueryString({
        baseQueryString,
        searchQuery: appliedSearchQuery,
        sortQuery: nextAppliedSortQuery,
      });

      navigate({ search: nextQueryString }, { replace: true });
    },
    [appliedSearchQuery, appliedSortQuery, baseQueryString, navigate],
  );

  const applySearch = useCallback(() => {
    setAppliedSearchQuery(draftSearchQuery);

    const nextQueryString = buildCollectionQueryString({
      baseQueryString,
      searchQuery: draftSearchQuery,
      sortQuery: appliedSortQuery,
    });

    navigate({ search: nextQueryString }, { replace: true });
  }, [appliedSortQuery, baseQueryString, draftSearchQuery, navigate]);

  const clearSearch = () => {
    resetSearchQuery();
    setAppliedSearchQuery(defaultSearchQuery);
    setAppliedSortQuery({ ordering: "" });
    navigate(routePaths.docs.to());
  };

  const documentQueryString = useMemo(
    () =>
      buildCollectionQueryString({
        baseQueryString,
        searchQuery: appliedSearchQuery,
        sortQuery: appliedSortQuery,
      }),
    [appliedSearchQuery, appliedSortQuery, baseQueryString],
  );

  const {
    data: rows,
    isPending,
    isError,
  } = useQuery({
    queryKey: [collectionUrl, documentQueryString],
    queryFn: () =>
      getCollection({ collectionUrl, queryString: documentQueryString }),
    enabled: Boolean(collectionUrl),
  });

  const { mutate: deleteDocumentMutation } = useMutation({
    mutationFn: ({ id }) => deleteCollectionItem({ collectionUrl, id }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [collectionUrl] }),
  });
  const deleteRow = useCallback(
    (resource) => setDocumentToDelete(resource),
    [],
  );

  const { mutate: postDocumentMutation } = useMutation({
    mutationFn: ({ formData }) =>
      postFormData({ url: collectionUrl, formData }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [collectionUrl] }),
    onError: (error) => {
      toast.error(error.data.file[0], toastStyles.error);
    },
  });

  const { mutate: ocrDocumentMutation } = useMutation({
    mutationFn: ({ formData }) =>
      postFormData({ url: documentOcrActionUrl, formData }),
    onError: (error) => {
      toast.error(error.data.file[0], toastStyles.error);
    },
    // これはocrロジック内のws送信によりinvalidateQueries更新を実施する
  });

  const postFormDataFile = useCallback(
    (file, { shouldStartOcr }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (shouldStartOcr) {
        ocrDocumentMutation({ formData });
        return;
      }
      postDocumentMutation({ formData });
    },
    [postDocumentMutation, ocrDocumentMutation],
  );

  const documentTableColumns = documentSpec.ui.table.map(
    ({ key, label, format }) => ({
      key,
      label,
      format,
    }),
  );

  useEffect(() => {
    const ws = new WebSocket(OCR_WS_URL);
    ws.onmessage = () =>
      queryClient.invalidateQueries({ queryKey: [collectionUrl] });
    return () => ws.close();
  }, [queryClient, collectionUrl]);

  return (
    <div className="flex flex-col gap-2 p-2 text-center">
      <p>DocumentsPage</p>
      <DocumentToolbar
        actions={{
          applySearch,
          updateSearchQuery,
          clearSearch,
          postFormDataFile,
        }}
        data={{ draftSearchQuery, appliedSearchQuery }}
      />
      {isPending ? (
        <div>Now Loading...</div>
      ) : isError ? (
        <div>読み込みに失敗しました</div>
      ) : (
        <DocumentTable
          actions={{
            columnsSort,
            dataRouter,
            deleteRow,
          }}
          data={{
            columns: documentTableColumns,
            rows,
            ordering: appliedSortQuery.ordering,
          }}
        />
      )}
      <AlertDialog.Root
        open={documentToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setDocumentToDelete(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay />
          <AlertDialog.Content>
            <AlertDialog.Title>
              本当に削除してよろしいですか？
            </AlertDialog.Title>
            <AlertDialog.Description>
              {documentToDelete?.file_name}
              を削除します。この操作は取り消せません。
            </AlertDialog.Description>
            <div className="mt-6 flex justify-end gap-2">
              <AlertDialog.Cancel>キャンセル</AlertDialog.Cancel>
              <AlertDialog.Action
                onClick={() => {
                  deleteDocumentMutation({ id: documentToDelete.id });
                  setDocumentToDelete(null);
                }}
              >
                削除
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
};
export default DocumentsPage;
