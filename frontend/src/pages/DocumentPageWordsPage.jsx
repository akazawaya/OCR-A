import MenuTable from "../components/MenuTable/MenuTable"
import { wordApiConfig } from "../route"
import { useReducer } from "react"
import { RefreshContext } from "../contexts/refreshContext"
import { useTableData } from "../hooks/server/useTableData"
import { useRouting } from "../hooks/routing/useRouting"

const DocumentPageWordsPage = () =>{
const [refresh, onRefresh] = useReducer(n => n + 1, 0);
const { schemaUrl, schemaName, dataUrl } = wordApiConfig;
const { search, columnsSort, routingRowFilter } = useRouting({
  rowSelector: (row) => row.page});
const { columns, rows, loading } = useTableData({schemaUrl, schemaName, dataUrl, search, refresh, onRefresh, routingRowFilter});

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
