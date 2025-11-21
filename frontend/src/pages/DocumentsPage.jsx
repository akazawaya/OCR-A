import { useReducer } from "react"
import FileUploader from "../components/FileUploader/FileUploader"
import Table from "../components/Table/Table"
import { analyzeDocumentApiConfig, documentApiConfig, routeTo } from "../route"
import { RefreshContext } from "../contexts/refreshContext"
import { useLocation, useNavigate } from "react-router-dom";
import { FilterButton } from "../components/FilterButton/FilterButton"

  const DocumentsPage = () =>{
    const navigate = useNavigate();
    const { search: queryString  } = useLocation(); 
    // navigate({ search: nextSearch });と宣言することで、search部分だけ変更してページ遷移してくれる
    const [refresh, onRefresh] = useReducer(n => n + 1, 0);
    
    return (
      <RefreshContext.Provider value={onRefresh}>
      <p>DocumentsPage</p>
      <FilterButton config={documentApiConfig} currentQueryString={queryString} 
                    onSearch={(nextSearch) => { navigate({ search: nextSearch }) }} />
      <FileUploader config={analyzeDocumentApiConfig} />
      <Table config={documentApiConfig} currentQueryString={queryString}
            refresh={refresh} 
            showDeleteButton={true}
            onRowClick={(row) => navigate(routeTo.docPages(row.id))}
        />
      </RefreshContext.Provider>
    )
  }
  export default DocumentsPage