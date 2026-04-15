import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
import { useRouting } from "../logic/routing/useRouting";
import { useFilterState } from "../logic/ui/useFilterState";
import { buildCollectionQueryString } from "../logic/server/buildCollectionQueryString";
import DocumentToolbar from "../components/Document/DocumentToolbar";
import DocumentTable from "../components/Document/DocumentTable";

const DocumentsPage = () => {
  const queryClient = useQueryClient();
  const { collectionUrl } = documentSpec;
  const { analyzeUrl } = analyzeDocumentAccessSpec;

  const { search, columnsSort, dataRouter } = useRouting({
    routeUrl: (resource) => routePaths.viewer.to(resource.id),
  });
  const { conditions, updateConditions } = useFilterState();

  const [appliedConditions, setAppliedConditions] = useState(conditions);
  const applySearch = useCallback(
    () => setAppliedConditions(conditions),
    [conditions],
  );

  const documentQueryString = useMemo(
    () =>
      buildCollectionQueryString({
        baseSearch: search,
        conditions: appliedConditions,
      }),
    [search, appliedConditions],
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
        data={{ conditions }}
        events={{
          onClickSearchButton: applySearch,
          onChangeConditions: updateConditions,
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
