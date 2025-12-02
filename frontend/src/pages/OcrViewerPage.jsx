import { useReducer } from "react"
import { RefreshContext } from "../contexts/refreshContext"
import { useLocation, useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import Viewer from "../components/Viewer/Viewer";
import { pageApiConfig } from "../route";

//　useParams の返り値は文字列になるのでNumber()で変換しておく

const OcrViewerPage = () =>{
  const navigate = useNavigate();
  const [refresh, onRefresh] = useReducer(n => n + 1, 0);
  const { primaryKey } = useParams();
  const { search: queryString  } = useLocation(); 

  const rowSelector =
  primaryKey !== "undefined"
    ? (row) => row.doc === Number(primaryKey)
    : undefined;
  const options = { rowSelector };


  return (
    <RefreshContext.Provider value={onRefresh}>
      <p>OcrViewerPage</p>
      <Viewer
      fetchBase={pageApiConfig}
      fetchFlow={{ refresh: refresh, query: queryString }}
      navigation={{
          onSearch:(nextSearch) => navigate({ search: nextSearch })}}
      options={options}

    />
    </RefreshContext.Provider>
  )
}
export default OcrViewerPage
