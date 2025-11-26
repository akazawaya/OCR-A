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

      <Table 
        fetchBase={documentApiConfig} 
        fetchFlow={{refresh:refresh, query:queryString}}
        navigation={{
          onSearch:(nextSearch) => { navigate({ search: nextSearch })},
          onRowClick:(row) => navigate(routeTo.docPages(row.id))
        }}
        options={{showDeleteButton:true}}
        />
      </RefreshContext.Provider>
    )
  }
  export default DocumentsPage