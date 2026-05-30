import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";

import {
  documentOcrAccessSpec,
  documentSpec,
  routePaths,
  WS_BASE_URL,
} from "../appConfig";
import { getCollection } from "../api/clients/collectionClient";
import {
  postDocument,
  startOcrDocument,
  deleteCollectionItem,
} from "../api/clients/mutationClient";
import { buildCollectionQueryString } from "../logic/urlQuery/buildCollectionQueryString";
import { defaultSearchQuery } from "../logic/urlQuery/searchQueryUtils";
import { toggleSortQuery } from "../logic/urlQuery/sortQueryUtils";
import { useSearchQuery } from "../logic/urlQuery/useSearchQuery";
import DocumentToolbar from "../components/Document/DocumentToolbar";
import DocumentTable from "../components/Document/DocumentTable";

const DocumentsPage = () => {
  const navigate = useNavigate();
  const { search: baseQueryString } = useLocation();
  const queryClient = useQueryClient();
  const { collectionUrl } = documentSpec;
  const { startOcrUrl } = documentOcrAccessSpec;
  const {
    searchQuery: draftSearchQuery,
    updateSearchQuery,
    resetSearchQuery,
  } = useSearchQuery();

  const [appliedSortQuery, setAppliedSortQuery] = useState({ ordering: "" });
  const [appliedSearchQuery, setAppliedSearchQuery] =
    useState(draftSearchQuery);

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

  const { mutate: deleteRowMutation } = useMutation({
    mutationFn: ({ id }) => deleteCollectionItem({ collectionUrl, id }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [collectionUrl] }),
  });
  const deleteRow = useCallback(
    (resource) => deleteRowMutation({ id: resource.id }),
    [deleteRowMutation],
  );

  const { mutate: postDocumentMutation } = useMutation({
    mutationFn: ({ formData }) => postDocument({ collectionUrl, formData }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [collectionUrl] }),
    onError: (error) => {
      window.alert(error.data.file[0]);
    },
  });

  const { mutate: startOcrDocumentMutation } = useMutation({
    mutationFn: ({ formData }) => startOcrDocument({ startOcrUrl, formData }),
    onError: (error) => {
      window.alert(error.data.file[0]);
    },
    // startOcrはocrロジック内のws送信によりinvalidateQueries更新を実施する
  });

  const postDocumentFile = useCallback(
    (file, { shouldStartOcr }) => {
      const formData = new FormData();
      formData.append("file", file);

      if (shouldStartOcr) {
        startOcrDocumentMutation({ formData });
        return;
      }

      postDocumentMutation({ formData });
    },
    [postDocumentMutation, startOcrDocumentMutation],
  );

  const documentTableColumns = documentSpec.ui.table.map(({ key, label }) => ({
    key,
    label,
  }));

  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE_URL}documents/`);
    ws.onmessage = () =>
      queryClient.invalidateQueries({ queryKey: [collectionUrl] });
    return () => ws.close();
  }, [queryClient, collectionUrl]);

  return (
    <div className="flex flex-col gap-2 p-2 text-center">
      <p>DocumentsPage</p>
      <DocumentToolbar
        data={{ draftSearchQuery, appliedSearchQuery }}
        events={{
          onClickSearchButton: applySearch,
          onChangeSearchInput: updateSearchQuery,
          onClickResetSearchButton: clearSearch,
          onClickPostDocumentButton: postDocumentFile,
        }}
      />
      {isPending ? (
        <div>Now Loading...</div>
      ) : isError ? (
        <div>読み込みに失敗しました</div>
      ) : (
        <DocumentTable
          data={{
            columns: documentTableColumns,
            rows,
            ordering: appliedSortQuery.ordering,
          }}
          events={{
            onClickColumn: columnsSort,
            onClickRow: dataRouter,
            onClickDeleteButton: deleteRow,
          }}
        />
      )}
    </div>
  );
};
export default DocumentsPage;
