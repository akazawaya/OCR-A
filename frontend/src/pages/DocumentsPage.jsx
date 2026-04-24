import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";

import {
  analyzeDocumentAccessSpec,
  documentSpec,
  routePaths,
  WS_BASE_URL,
} from "../appConfig";
import { getCollection } from "../api/clients/collectionClient";
import {
  analyzeDocument,
  deleteCollectionItem,
} from "../api/clients/mutationClient";
import { getUploadErrorMessage } from "../logic/upload/getUploadErrorMessage";
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
  const { analyzeUrl } = analyzeDocumentAccessSpec;
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
      const currentSortQuery = {
        ordering:
          new URLSearchParams(baseQueryString || "").get("ordering") || "",
      };
      const nextAppliedSortQuery = toggleSortQuery(
        currentSortQuery,
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
    [appliedSearchQuery, baseQueryString, navigate],
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

  const { data: rows } = useQuery({
    queryKey: [collectionUrl, documentQueryString],
    queryFn: () =>
      getCollection({ collectionUrl, queryString: documentQueryString }),
    enabled: Boolean(collectionUrl),
    placeholderData: [],
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

  const { mutate: analyzeMutation } = useMutation({
    mutationFn: ({ formData }) => analyzeDocument({ analyzeUrl, formData }),
    onError: (error) => {
      window.alert(getUploadErrorMessage(error));
    },
  });

  const analyzeData = useCallback(
    (file) => {
      const formData = new FormData();
      formData.append("file", file);
      analyzeMutation({ formData });
    },
    [analyzeMutation],
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
        data={{ draftSearchQuery }}
        events={{
          onClickSearchButton: applySearch,
          onChangeSearchInput: updateSearchQuery,
          onClickResetSearchButton: clearSearch,
          onClickAnalyzeButton: analyzeData,
        }}
      />
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
    </div>
  );
};
export default DocumentsPage;
