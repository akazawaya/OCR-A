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
import { useSearchState } from "../logic/urlQuery/useSearchState";
import { buildCollectionQueryString } from "../logic/urlQuery/buildCollectionQueryString";
import DocumentToolbar from "../components/Document/DocumentToolbar";
import DocumentTable from "../components/Document/DocumentTable";
import { toggleOrdering } from "../logic/urlQuery/toggleOrdering";

const DocumentsPage = () => {
  const navigate = useNavigate();
  const { search: baseQueryString } = useLocation();
  const queryClient = useQueryClient();
  const { collectionUrl } = documentSpec;
  const { analyzeUrl } = analyzeDocumentAccessSpec;
  const { searchQuery: draftSearchQuery, updateSearchQuery } = useSearchState();

  const [appliedSortQuery, setAppliedSortQuery] = useState({ ordering: "" });
  const [appliedSearchQuery, setAppliedSearchQuery] =
    useState(draftSearchQuery);

  const dataRouter = useCallback(
    (resource) => navigate(routePaths.viewer.to(resource.id)),
    [navigate],
  );

  const columnsSort = useCallback(
    (orderingField) => {
      const currentOrderingValue =
        new URLSearchParams(baseQueryString || "").get("ordering") || "";

      const nextOrderingValue = toggleOrdering(
        currentOrderingValue,
        orderingField,
      );

      const nextAppliedSortQuery = { ordering: nextOrderingValue };
      setAppliedSortQuery(nextAppliedSortQuery);

      const nextQueryString = buildCollectionQueryString({
        baseQueryString,
        searchQuery: appliedSearchQuery,
        routingQuery: nextAppliedSortQuery,
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
      routingQuery: appliedSortQuery,
    });

    navigate({ search: nextQueryString }, { replace: true });
  }, [appliedSortQuery, baseQueryString, draftSearchQuery, navigate]);

  const documentQueryString = useMemo(
    () =>
      buildCollectionQueryString({
        baseQueryString,
        searchQuery: appliedSearchQuery,
        routingQuery: appliedSortQuery,
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
          onClickAnalyzeButton: analyzeData,
        }}
      />
      <DocumentTable
        data={{ columns: documentTableColumns, rows }}
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
