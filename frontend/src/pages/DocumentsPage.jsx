import { useReducer } from "react"
import FileUploader from "../components/FileUploader/FileUploader"
import Table from "../components/Table/Table"
import { analyzeDocumentApiConfig, documentApiConfig, routeTo } from "../route"
import { RefreshContext } from "../contexts/refreshContext"
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FilterButton } from "../components/FilterButton/FilterButton"
import { useEffect, useState } from "react";
import { requestApi } from "../api/requestApi"

// currentOrderingを　なし→　+　→　-　→　解除の流れで記入
const toggleOrdering = (current, field) => {
  if (current === field) return `-${field}`; 
  else if (current === `-${field}`) return ""; 
  else return field;   // なしor別フィールド → 昇順開始
}

//　handleXXX→イベントの“処理する関数”　クリック等トリガーを受けてonXXXを親へ伝えるだけ
//  onXXX→イベントの“登録先”　子では呼び出すのみとして、親で処理を行う
// というコンポーネント構造を保ちたい

// fetchのresponse→OpenAPI仕様（specification）をjsonで取得
async function loadSchemaColumns(schemaUrl, schemaName) {
  const { res, data } = await requestApi(schemaUrl);
  if (!res?.ok) return [];
  const schema = data?.components?.schemas?.[schemaName];
  if (!schema?.properties) return [];
  
  const props = schema.properties;
  const required = Array.isArray(schema.required) ? schema.required : [];
	// requiredのバリデーションは配列か否かを確認するのが良いらしい
	// →Parameter Object の required: true/false（真偽値）も存在するため
  // 並び：必須→その他（元の出現順がわからなければ名前順）
  const allKeys = Object.keys(props);
  const others = allKeys.filter(k => !required.includes(k)).sort();
  const ordered = [...required, ...others]; // スプレッド構文じゃないとフラットに配列を結合できない
	
  return ordered.map(key => ({
    key,
		label: key,
  }));
}

const DocumentsPage = () => {
  const navigate = useNavigate();
  const { search } = useLocation(); // search === "?ordering=file_name"という search プロパティを抽出　 {}は分割代入として一致するプロパティを抜き出せる
  // location{ pathname: "/documents", search: "?ordering=file_name",hash: "",state: null,key: "abc123"}
  const { primaryKey } = useParams() // { primaryKey: "123" }
  const [refresh, onRefresh] = useReducer(n => n + 1, 0);
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  
  const queryParams = new URLSearchParams(search || ""); //ordering = "file_name"
  const ordering = queryParams.get("ordering") || ""; // "file_name"

  const { schemaUrl, schemaName, dataUrl } = documentApiConfig;


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

  const onSearch = (nextSearch) => {
   navigate({ search: nextSearch });
  };

  const rowSelector =
    primaryKey !== "undefined"
      ? (row) => row.page === Number(primaryKey)
      : undefined;
    // DocumentPageでは不要だが他のPageに使うため入れておく

  const handleDeleteRow = async (row) => {
    const deleteUrl = `${dataUrl}${row.id}/`;
    const { res } = await requestApi(deleteUrl, { method: 'DELETE' });
    if (res?.ok) {
      onRefresh();   // ← これで useEffect が再fetchされる
    }};

    useEffect(() => {
    (async () => {
      //スキーマから列を自動生成
      const columns = await loadSchemaColumns(schemaUrl, schemaName);
      setColumns(columns);
        //データ本体を取得
      const url = search ? `${dataUrl}${search}` : dataUrl
      const { data }  = await requestApi(url); 
      const arr = Array.isArray(data) ? data : [];  
      setRows(arr); //rowSelectorによるid絞り込み

    })();
  }, [search, refresh]);

  
  return (
    <RefreshContext.Provider value={onRefresh}>
    <p>DocumentsPage</p>
    <FilterButton fetchBase={documentApiConfig} 
                  fetchFlow={{query:search}}
                  navigation={{
                    onSearch:(nextSearch) => { navigate({ search: nextSearch })}
                  }}
                    />
    <FileUploader fetchBase={analyzeDocumentApiConfig} />
    <Table 
      data={{columns, rows, ordering }}
      navigation={{
        onColumnClick,
        onRowClick,
        onSearch,
      }}
      options={{
        showDeleteButton:true,
        onDeleteRow: handleDeleteRow,
        rowSelector:
            primaryKey !== "undefined"  ?(row) => row.page === Number(primaryKey) : undefined
      }}

      />
    </RefreshContext.Provider>
  )
}
export default DocumentsPage