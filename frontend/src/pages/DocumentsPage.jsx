import Table from "../components/Table/Table"
import FileUploader from "../components/FileUploader/FileUploader"
import { FilterButton } from "../components/FilterButton/FilterButton"
import { analyzeDocumentApiConfig, documentApiConfig } from "../route"
import { useReducer } from "react"
import { RefreshContext } from "../contexts/refreshContext"
import { useTableData } from "../hooks/useTableData"
import { useRouting } from "../hooks/useRouting"

const DocumentsPage = () => {
  // location{ pathname: "/documents", search: "?ordering=file_name",hash: "",state: null,key: "abc123"
  const [refresh, onRefresh] = useReducer(n => n + 1, 0);
  const { schemaUrl, schemaName, dataUrl } = documentApiConfig;
  const { search, columnsSort, dataRouter, routingRowFilter, applySearchFilter } = useRouting();
  const { columns, rows, loading, deleteRow } = useTableData(schemaUrl, schemaName, dataUrl, search, refresh, onRefresh);
  
  return (
    <RefreshContext.Provider value={onRefresh}>
    <p>DocumentsPage</p>
    <FilterButton 
      fetchBase={documentApiConfig} 
      fetchFlow={{query:search}}
      navigation={{onSearchButtonClick: applySearchFilter}}
                    />
    <FileUploader fetchBase={analyzeDocumentApiConfig} />
    <Table 
      data={{ columns, rows, loading }}
      navigation={{
        onColumnClick:columnsSort,
        onRowClick:dataRouter,
      }}

      options={{
        onDataRouting:routingRowFilter,
        onDeleteButtonClick:deleteRow,
      }}
      />
    </RefreshContext.Provider>
  )
}
export default DocumentsPage