import MenuTable from "../components/MenuTable/MenuTable"
import { wordAccessSpec } from "../appConfig";
import { useMemo, useReducer } from "react"
import { RefreshContext } from "../contexts/refreshContext"
import { useRouting } from "../hooks/routing/useRouting"
import { useBackendQuery } from "../hooks/server/query/useBackendQuery"
import { getSchema } from "../api/clients/schemaClient"
import { buildColumnDefsFromSchema } from "../hooks/server/query/schemaColumns"
import { getCollection } from "../api/clients/collectionClient"
import { buildSearch } from "../hooks/server/query/collectionQuery"

const DocumentPageWordsPage = () =>{
const [refresh, onRefresh] = useReducer(n => n + 1, 0);
const { schemaUrl, schemaKey, collectionUrl } = wordAccessSpec;
const { search, columnsSort, primaryKey } = useRouting({});
const { data: schema, isLoading: schemaLoading } = useBackendQuery({
  queryKey: ["schema", schemaUrl, schemaKey],
  queryFn: () => getSchema({ schemaUrl, schemaKey }),
  enabled: Boolean(schemaUrl && schemaKey),
  initialData: null,
});
const columns = useMemo(() => buildColumnDefsFromSchema(schema), [schema]);

const finalSearch = useMemo(
  () => buildSearch({ baseSearch: search, routing: { page: primaryKey } }),
  [search, primaryKey]
);

const { data: rows, isLoading: rowsLoading } = useBackendQuery({
  queryKey: ["collection", collectionUrl, finalSearch ?? "", refresh],
  queryFn: () => getCollection({ collectionUrl, search: finalSearch }),
  enabled: Boolean(collectionUrl),
  initialData: [],
});
const loading = schemaLoading || rowsLoading;

return (
  <RefreshContext.Provider value={onRefresh}>
  <p>DocumentPageWordsPage</p>
  <MenuTable
    data={{ columns, rows, loading }}
    navigation={{
      onClickColumn:columnsSort,
    }}
        />
  </RefreshContext.Provider>
)
}
export default DocumentPageWordsPage
