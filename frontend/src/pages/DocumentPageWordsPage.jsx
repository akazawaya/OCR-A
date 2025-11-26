import { useReducer } from "react"
import Table from "../components/Table/Table"
import { wordApiConfig } from "../route"
import { RefreshContext } from "../contexts/refreshContext"
import { useLocation, useNavigate, useParams } from "react-router-dom"

  const DocumentPageWordsPage = () =>{
    const navigate = useNavigate();
    const [refresh, onRefresh] = useReducer(n => n + 1, 0);
    const { primaryKey } = useParams();
    const { search: queryString  } = useLocation(); 

    return (
      <RefreshContext.Provider value={onRefresh}>
      <p>DocumentPageWordsPage</p>
      
      <Table 
        fetchBase={wordApiConfig} 
        fetchFlow={{ refresh: refresh, query: queryString }}
        navigation={{
          onSearch:(nextSearch) => { navigate({ search: nextSearch }) }
        }}
        options={{
          rowSelector:
            primaryKey !== "undefined"  ?(row) => row.page === Number(primaryKey) : undefined
        }}
      />
      </RefreshContext.Provider>
    )
  }
  export default DocumentPageWordsPage