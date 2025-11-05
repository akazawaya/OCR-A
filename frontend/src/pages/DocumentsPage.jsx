import { useReducer } from "react"
import FileUploader from "../components/FileUploader/FileUploader"
import Table from "../components/Table/Table"
import { analyzeDocumentSchemaConfig, documentSchemaConfig, pageSchemaConfig, wordSchemaConfig } from "../route"
import { RefreshContext } from "../contexts/refreshContext"

  const DocumentsPage = () =>{
    const [refresh, onRefresh] = useReducer(n => n + 1, 0);
    return (
      <RefreshContext.Provider value={onRefresh}>
      <p>DocumentsPage</p>
      <FileUploader config={analyzeDocumentSchemaConfig} />
      <Table config={documentSchemaConfig} refresh={refresh}/>
      <Table config={pageSchemaConfig} refresh={refresh}/>
      <Table config={wordSchemaConfig} refresh={refresh}/>
      </RefreshContext.Provider>
    )
  }
  export default DocumentsPage