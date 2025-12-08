import Table from "../components/Table/Table"
import { pageApiConfig } from "../route"
import { useReducer } from "react"
import { RefreshContext } from "../contexts/refreshContext"
import { useTableData } from "../hooks/useTableData"
import { useRouting } from "../hooks/useRouting"
import { routeTo } from "../route";

  const DocumentPagesPage = () =>{
  const [refresh, onRefresh] = useReducer(n => n + 1, 0);
  const { schemaUrl, schemaName, dataUrl } = pageApiConfig;
  const { search, columnsSort, dataRouter, routingRowFilter }
   = useRouting((row) => routeTo.docPageWords(row.doc, row.id));
  const { columns, rows, loading } = useTableData(schemaUrl, schemaName, dataUrl, search, refresh, onRefresh);

  return (
    <RefreshContext.Provider value={onRefresh}>
    <p>DocumentPagesPage</p>
    
    <Table 
      data={{ columns, rows, loading }}
      navigation={{
        onColumnClick:columnsSort,
        onRowClick:dataRouter,
      }}
      options={{
        onDataRouting:routingRowFilter,
      }}
          />
    </RefreshContext.Provider>
  )
  }
  export default DocumentPagesPage