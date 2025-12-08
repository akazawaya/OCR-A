import { useReducer } from "react"
import FileUploader from "../components/FileUploader/FileUploader"
import Table from "../components/Table/Table"
import { analyzeDocumentApiConfig, documentApiConfig, routeTo } from "../route"
import { RefreshContext } from "../contexts/refreshContext"
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FilterButton } from "../components/FilterButton/FilterButton"
import { useTableData } from "../hooks/useTableData"


// currentOrderingを　なし→　+　→　-　→　解除の流れで記入
const toggleOrdering = (current, field) => {
  if (current === field) return `-${field}`; 
  else if (current === `-${field}`) return ""; 
  else return field;   // なしor別フィールド → 昇順開始
}
//　handleXXX→イベントの“処理する関数”　クリック等トリガーを受けてonXXXを親へ伝えるだけ
//  onXXX→イベントの“登録先”　子では呼び出すのみとして、親で処理を行う
// というコンポーネント構造を保ちたい

const DocumentsPage = () => {
  const navigate = useNavigate();
  const { search } = useLocation(); // search === "?ordering=file_name"という search プロパティを抽出　 {}は分割代入として一致するプロパティを抜き出せる
  // location{ pathname: "/documents", search: "?ordering=file_name",hash: "",state: null,key: "abc123"}
  const { primaryKey } = useParams() // { primaryKey: "123" }
  const [refresh, onRefresh] = useReducer(n => n + 1, 0);
  const queryParams = new URLSearchParams(search || ""); //ordering = "file_name"
  const ordering = queryParams.get("ordering") || ""; // "file_name"


  const { schemaUrl, schemaName, dataUrl } = documentApiConfig;
  const { columns, rows, deleteRow } = useTableData(schemaUrl, schemaName, dataUrl, search, refresh, onRefresh);
  
  const onColumnClick = (field) => { // orderingを引数にすると、子がorderingを把握する必要が出るため書かない
    const next = toggleOrdering(ordering, field);
    const params = new URLSearchParams(search); //ordering = "file_name"

    if (next) params.set("ordering", next);
    else params.delete("ordering");
    navigate({ search: params.toString() });
  };

  const onRowClick = (row) => {
    navigate(routeTo.ocr(row.id));
  };

  const onSearchButtonClick = (nextSearch) => {
   navigate({ search: nextSearch });
  };

  const rowSelector =
    primaryKey !== "undefined"
      ? (row) => row.page === Number(primaryKey)
      : undefined;
    // DocumentPageでは不要だが他のPageに使うため入れておく
  
  return (
    <RefreshContext.Provider value={onRefresh}>
    <p>DocumentsPage</p>
    <FilterButton fetchBase={documentApiConfig} 
                  fetchFlow={{query:search}}
                  navigation={{
                    onSearch:(nextSearch) => { navigate({ search: nextSearch }) }
                  }}
                    />
    <FileUploader fetchBase={analyzeDocumentApiConfig} />
    <Table 
      data={{ columns, rows, ordering }}
      navigation={{
        onColumnClick,
        onRowClick,
      }}

      options={{
        onDeleteButtonClick: deleteRow,
        rowSelector:
          primaryKey !== "undefined"  ?(row) => row.page === Number(primaryKey) : undefined
      }}

      />
    </RefreshContext.Provider>
  )
}
export default DocumentsPage