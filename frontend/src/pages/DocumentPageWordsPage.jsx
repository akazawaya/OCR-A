import { useReducer } from "react"
import Table from "../components/Table/Table"
import { wordSchemaConfig } from "../route"
import { RefreshContext } from "../contexts/refreshContext"
import { useParams } from "react-router-dom"

  const DocumentPageWordsPage = () =>{
    const [refresh, onRefresh] = useReducer(n => n + 1, 0);
    const { primaryKey } = useParams();
    return (
      <RefreshContext.Provider value={onRefresh}>
      <p>DocumentPageWordsPage</p>
      <Table config={wordSchemaConfig} refresh={refresh}
                    rowFilter={(row) => row.page === Number(primaryKey)}/>
      </RefreshContext.Provider>
    )
  }
  export default DocumentPageWordsPage