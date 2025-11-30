import { useReducer } from "react"
import Table from "../components/Table/Table"
import { pageApiConfig, routeTo } from "../route"
import { RefreshContext } from "../contexts/refreshContext"
import { useLocation, useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import ViewerImage from "../components/ViewerImage/ViewerImage";
//　useParams の返り値は文字列になるのでNumber()で変換しておく

  const OcrViewerPage = () =>{
    const [refresh, onRefresh] = useReducer(n => n + 1, 0);
    const { primaryKey } = useParams();
    const { search: queryString  } = useLocation(); 

    return (
      <RefreshContext.Provider value={onRefresh}>
      <p>OcrViewerPage</p>
      <ViewerImage
        fetchBase={pageApiConfig} 
        fetchFlow={{ refresh: refresh, query: queryString }}
        options={{
          rowSelector:
            primaryKey !== "undefined"  ?(row) => row.doc === Number(primaryKey) : undefined
        }}
      />

      <Table 
        fetchBase={pageApiConfig} 
        fetchFlow={{ refresh: refresh, query: queryString }}
        options={{
          rowSelector:
            primaryKey !== "undefined"  ?(row) => row.doc === Number(primaryKey) : undefined
        }}
      />
      </RefreshContext.Provider>
    )
  }
  export default OcrViewerPage
