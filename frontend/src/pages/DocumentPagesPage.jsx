import { useReducer } from "react"
import Table from "../components/Table/Table"
import { pageSchemaConfig, routeTo } from "../route"
import { RefreshContext } from "../contexts/refreshContext"
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
//　useParams の返り値は文字列になるのでNumber()で変換しておく


  const DocumentPagesPage = () =>{
    const navigate = useNavigate();
    const [refresh, onRefresh] = useReducer(n => n + 1, 0);
    const { primaryKey } = useParams();

    return (
      <RefreshContext.Provider value={onRefresh}>
      <p>DocumentPagesPage</p>
      <Table config={pageSchemaConfig} refresh={refresh} 
                      onRowClick={(row) => navigate(routeTo.docPageWords(row.doc, row.id))}
                      rowFilter={primaryKey !== "undefined"  ?
                        (row) => row.doc === Number(primaryKey)
                        : undefined}
                     />
      </RefreshContext.Provider>
    )
  }
  export default DocumentPagesPage
