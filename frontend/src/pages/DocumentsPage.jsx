import { useReducer } from "react"
import FileUploader from "../components/FileUploader/FileUploader"
import Table from "../components/Table/Table"
import { analyzeDocumentApiConfig, documentApiConfig, routeTo } from "../route"
import { RefreshContext } from "../contexts/refreshContext"
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FilterButton } from "../components/FilterButton/FilterButton"
import { useEffect, useState } from "react";
import { requestApi } from "../api/requestApi"


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
  const { search: queryString } = useLocation(); 
  // navigate({ search: nextSearch });と宣言することで、search部分だけ変更してページ遷移してくれる
  const [refresh, onRefresh] = useReducer(n => n + 1, 0);
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const { primaryKey } = useParams();
  const rowSelector =
  primaryKey !== "undefined"
    ? (row) => row.page === Number(primaryKey)
    : undefined;
  const handleDeleteRow = async (row) => {
  const deleteUrl = `${dataUrl}${row.id}/`;
  const { res } = await requestApi(deleteUrl, { method: 'DELETE' });
  if (res?.ok) {
    onRefresh();   // ← これで useEffect が再fetchされる
  }};

  const { schemaUrl, schemaName, dataUrl } = documentApiConfig;

    useEffect(() => {
    (async () => {
      //スキーマから列を自動生成
      const columns = await loadSchemaColumns(schemaUrl, schemaName);
      setColumns(columns);
        //データ本体を取得
      const url = queryString ? `${dataUrl}${queryString}` : dataUrl
      const {data}  = await requestApi(url); 
      const arr = Array.isArray(data) ? data : [];  
      setRows(arr); //rowSelectorによるid絞り込み

    })();
  }, [queryString, refresh]);

  
  return (
    <RefreshContext.Provider value={onRefresh}>
    <p>DocumentsPage</p>
    <FilterButton fetchBase={documentApiConfig} 
                  fetchFlow={{query:queryString}}
                  navigation={{
                    onSearch:(nextSearch) => { navigate({ search: nextSearch })}
                  }}
                    />
    <FileUploader fetchBase={analyzeDocumentApiConfig} />

    <Table 
      fetchBase={documentApiConfig} 
      fetchFlow={{refresh:refresh, query:queryString}}
      navigation={{
        onSearch:(nextSearch) => { navigate({ search: nextSearch })},
        onRowClick:(row) => navigate(routeTo.ocr(row.id))
      }}
      options={{
        showDeleteButton:true,
        onDeleteRow: handleDeleteRow,
        rowSelector:
            primaryKey !== "undefined"  ?(row) => row.page === Number(primaryKey) : undefined
      }}
      
      data={{columns, rows}}
      

      />
    </RefreshContext.Provider>
  )
}
export default DocumentsPage