import { useReducer } from "react"
import FileUploader from "../components/FileUploader/FileUploader"
import Table from "../components/Table/Table"
import { analyzeDocumentSchemaConfig, documentSchemaConfig, pageSchemaConfig, wordSchemaConfig } from "../route"
import { RefreshContext } from "../contexts/refreshContext"

  const DocumentPageWordsPage = () =>{
    const [refresh, onRefresh] = useReducer(n => n + 1, 0);
    return (
      <RefreshContext.Provider value={onRefresh}>
      <p>DocumentPageWordsPage</p>
      <Table config={wordSchemaConfig} refresh={refresh}/>
      </RefreshContext.Provider>
    )
  }
  export default DocumentPageWordsPage