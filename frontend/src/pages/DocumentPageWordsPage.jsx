import Table from "../components/Table/Table"
import { wordApiConfig } from "../route"
import { useReducer } from "react"
import { RefreshContext } from "../contexts/refreshContext"
import { useTableData } from "../hooks/useTableData"
import { useRouting } from "../hooks/useRouting"

  const DocumentPageWordsPage = () =>{
  const [refresh, onRefresh] = useReducer(n => n + 1, 0);
  const { schemaUrl, schemaName, dataUrl } = wordApiConfig;
  const { search, columnsSort, routingRowFilter } = useRouting();
  const { columns, rows, loading } = useTableData(schemaUrl, schemaName, dataUrl, search, refresh, onRefresh);

  return (
    <RefreshContext.Provider value={onRefresh}>
    <p>DocumentPageWordsPage</p>
    <Table 
      data={{ columns, rows, loading }}
      navigation={{
        onColumnClick:columnsSort,
      }}
      options={{
        onDataRouting:routingRowFilter,
      }}
          />
    </RefreshContext.Provider>
  )
  }
  export default DocumentPageWordsPage