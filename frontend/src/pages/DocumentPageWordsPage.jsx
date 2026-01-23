import MenuTable from "../components/MenuTable/MenuTable"
import { wordAccessSpec } from "../appConfig";
import { useMemo, useReducer } from "react"
import { RefreshContext } from "../contexts/refreshContext"
import { useRouting } from "../hooks/routing/useRouting"
import { useBackendQuery } from "../hooks/server/query/useBackendQuery"
import { getSchema, buildColumnDefsFromSchema } from "../api/clients/schemaClient"
import { getCollection } from "../api/clients/collectionClient"
import { applyFilter } from "../utils/queryUi"

const DocumentPageWordsPage = () =>{
const [refresh, onRefresh] = useReducer(n => n + 1, 0);
const { schemaUrl, schemaKey, collectionUrl } = wordAccessSpec;
const { search, columnsSort, routingRowFilter } = useRouting({
  rowSelector: (row) => row.page});
const { data: schema, isLoading: schemaLoading } = useBackendQuery({
  queryKey: ["schema", schemaUrl, schemaKey],
  queryFn: () => getSchema({ schemaUrl, schemaKey }),
  enabled: Boolean(schemaUrl && schemaKey),
  initialData: null,
});
const columns = useMemo(() => buildColumnDefsFromSchema(schema), [schema]);

const { data: rowsRaw, isLoading: rowsLoading } = useBackendQuery({
  queryKey: ["collection", collectionUrl, search ?? "", refresh],
  queryFn: () => getCollection({ collectionUrl, search }),
  enabled: Boolean(collectionUrl),
  initialData: [],
});
const rows = useMemo(() => applyFilter(rowsRaw, routingRowFilter), [rowsRaw, routingRowFilter]);
const loading = schemaLoading || rowsLoading;

return (
  <RefreshContext.Provider value={onRefresh}>
  <p>DocumentPageWordsPage</p>
  <MenuTable
    data={{ columns, rows, loading }}
    navigation={{
      onColumnClick:columnsSort,
    }}
        />
  </RefreshContext.Provider>
)
}
export default DocumentPageWordsPage
