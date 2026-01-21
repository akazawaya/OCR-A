import MenuTable from "../components/MenuTable/MenuTable"
import { pageAccessSpec, routePaths } from "../appConfig";
import { useReducer } from "react"
import { RefreshContext } from "../contexts/refreshContext"
import { useTableData } from "../hooks/server/useTableData"
import { useRouting } from "../hooks/routing/useRouting"

const DocumentPagesPage = () =>{
const [refresh, onRefresh] = useReducer(n => n + 1, 0);
const { schemaUrl, schemaKey, collectionUrl } = pageAccessSpec;
const { search, columnsSort, routingRowFilter } = useRouting({
  routeUrl: (row) => routePaths.docPageWords(row.doc, row.id),
  rowSelector: (row) => row.doc,
});
const { columns, rows, loading } = useTableData({schemaUrl, schemaKey, collectionUrl, search, refresh, onRefresh, routingRowFilter});

return (
  <RefreshContext.Provider value={onRefresh}>
  <p>DocumentPagesPage</p>
  
  <MenuTable 
    data={{ columns, rows, loading }}
    navigation={{
      onColumnClick:columnsSort,
    }}
        />
  </RefreshContext.Provider>
)
}
export default DocumentPagesPage
