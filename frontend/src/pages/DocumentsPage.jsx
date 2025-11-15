import { useReducer } from "react"
import FileUploader from "../components/FileUploader/FileUploader"
import Table from "../components/Table/Table"
import { analyzeDocumentApiConfig, documentApiConfig, routeTo } from "../route"
import { RefreshContext } from "../contexts/refreshContext"
import { useNavigate } from "react-router-dom";
import { SearchButton } from "../components/SearchButton/SearchButton"

  const DocumentsPage = () =>{
    const navigate = useNavigate();
    const [refresh, onRefresh] = useReducer(n => n + 1, 0);
    return (
      <RefreshContext.Provider value={onRefresh}>
      <SearchButton />
      <p>DocumentsPage</p>
      <FileUploader config={analyzeDocumentApiConfig} />
      <Table config={documentApiConfig} refresh={refresh} 
                                       showDeleteButton={true}
                                       onRowClick={(row) => navigate(routeTo.docPages(row.id)
                                       )}/>
      </RefreshContext.Provider>
    )
  }
  export default DocumentsPage