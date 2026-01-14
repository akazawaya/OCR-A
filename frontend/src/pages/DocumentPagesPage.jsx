import MenuTable from "../components/MenuTable/MenuTable"
import { pageApiConfig } from "../route"
import { useReducer } from "react"
import { RefreshContext } from "../contexts/refreshContext"
import { useTableData } from "../hooks/server/useTableData"
import { useRouting } from "../hooks/routing/useRouting"
import { routeTo } from "../route";

const DocumentPagesPage = () =>{
const [refresh, onRefresh] = useReducer(n => n + 1, 0);
const { schemaUrl, schemaName, dataUrl } = pageApiConfig;
const { search, columnsSort, routingRowFilter } = useRouting({
  routeUrl: (row) => routeTo.docPageWords(row.doc, row.id),
  rowSelector: (row) => row.doc,
});
const { columns, rows, loading } = useTableData({schemaUrl, schemaName, dataUrl, search, refresh, onRefresh, routingRowFilter});

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
