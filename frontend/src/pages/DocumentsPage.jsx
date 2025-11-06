import { useReducer } from "react"
import FileUploader from "../components/FileUploader/FileUploader"
import Table from "../components/Table/Table"
import { analyzeDocumentSchemaConfig, documentSchemaConfig, routeTo } from "../route"
import { RefreshContext } from "../contexts/refreshContext"
import { useNavigate } from "react-router-dom";

  const DocumentsPage = () =>{
    const navigate = useNavigate();
    const [refresh, onRefresh] = useReducer(n => n + 1, 0);
    return (
      <RefreshContext.Provider value={onRefresh}>
      <p>DocumentsPage</p>
      <FileUploader config={analyzeDocumentSchemaConfig} />
      <Table config={documentSchemaConfig} refresh={refresh} 
                                       showDeleteButton={true}
                                       onRowClick={(row) => navigate(routeTo.docPages(row.id))}/>
      </RefreshContext.Provider>
    )
  }
  export default DocumentsPage