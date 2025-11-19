import { useMemo, useReducer } from "react"
import FileUploader from "../components/FileUploader/FileUploader"
import Table from "../components/Table/Table"
import { analyzeDocumentApiConfig, documentApiConfig, routeTo } from "../route"
import { RefreshContext } from "../contexts/refreshContext"
import { useLocation, useNavigate } from "react-router-dom";
import { FilterButton } from "../components/FilterButton/FilterButton"

  const DocumentsPage = () =>{
    const navigate = useNavigate();
    const { search: queryString  } = useLocation(); 
    const [refresh, onRefresh] = useReducer(n => n + 1, 0);
    // 検索
    
    const searchDataUrl = useMemo(() => {
      const dataUrl = documentApiConfig.dataUrl;
      return queryString ? `${dataUrl}${queryString}` : dataUrl;
      }, [queryString]);
    
    return (
      <RefreshContext.Provider value={onRefresh}>
      <p>DocumentsPage</p>
      <FilterButton config={documentApiConfig}/>
      <FileUploader config={analyzeDocumentApiConfig} />
      <Table config={documentApiConfig} 
            searchDataUrl={searchDataUrl}
            refresh={refresh} 
            showDeleteButton={true}
            onRowClick={(row) => navigate(routeTo.docPages(row.id))}
        />
      </RefreshContext.Provider>
    )
  }
  export default DocumentsPage