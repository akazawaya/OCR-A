import { useReducer } from "react"
import FileUploader from "../components/FileUploader/FileUploader"
import Table from "../components/Table/Table"
import { analyzeDocumentSchemaConfig, documentSchemaConfig, pageSchemaConfig, wordSchemaConfig } from "../route"
import { RefreshContext } from "../contexts/refreshContext"

  const DocumentPagesPage = () =>{
    const [refresh, onRefresh] = useReducer(n => n + 1, 0);
    return (
      <RefreshContext.Provider value={onRefresh}>
      <p>DocumentPagesPage</p>
      <Table config={pageSchemaConfig} refresh={refresh}/>
      </RefreshContext.Provider>
    )
  }
  export default DocumentPagesPage