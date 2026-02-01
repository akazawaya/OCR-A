import MenuTable from "../components/MenuTable/MenuTable"
import { pageAccessSpec, routePaths } from "../appConfig";
import { useMemo, useReducer } from "react"
import { RefreshContext } from "../contexts/refreshContext"
import { useRouting } from "../hooks/routing/useRouting"
import { useBackendQuery } from "../hooks/server/useBackendQuery"
import { getSchema } from "../api/clients/schemaClient"
import { buildColumnDefsFromSchema } from "../hooks/server/schemaColumns"
import { getCollection } from "../api/clients/collectionClient"
import { buildSearch } from "../hooks/server/collectionQuery"

const DocumentPagesPage = () =>{
const [refresh, onRefresh] = useReducer(n => n + 1, 0);
const { schemaUrl, schemaKey, collectionUrl } = pageAccessSpec;
const { search, columnsSort, primaryKey } = useRouting({
  routeUrl: (row) => routePaths.docPageWords(row.doc, row.id),
});
const { data: schema, isLoading: schemaLoading } = useBackendQuery({
  queryKey: ["schema", schemaUrl, schemaKey],
  queryFn: () => getSchema({ schemaUrl, schemaKey }),
  enabled: Boolean(schemaUrl && schemaKey),
  initialData: null,
});
const columns = useMemo(() => buildColumnDefsFromSchema(schema), [schema]);

const finalSearch = useMemo(
  () => buildSearch({ baseSearch: search, routing: { doc: primaryKey } }),
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
  <p>DocumentPagesPage</p>
  
  <MenuTable 
    data={{ columns, rows, loading }}
    navigation={{
      onClickColumn:columnsSort,
    }}
        />
  </RefreshContext.Provider>
)
}
export default DocumentPagesPage
