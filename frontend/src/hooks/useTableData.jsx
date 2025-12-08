import { useEffect, useState } from "react";
import { requestApi } from "../api/requestApi"

async function loadSchemaColumns(schemaUrl, schemaName) {
  const { data } = await requestApi(schemaUrl);
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

  return ordered.map(key => ({key,label: key,}));
}

async function loadSchemaRows(dataUrl, search){
  const url = search ? `${dataUrl}${search}` : dataUrl
  const { data } = await requestApi(url); 
  return Array.isArray(data) ? data : []; 
}

export const useTableData = (schemaUrl, schemaName, dataUrl, search, refresh, onRefresh) => {
  const [loading, setLoading] = useState(true); //データが“今ロード中かどうか”のフラグ
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true); // 開始

      const columns = await loadSchemaColumns(schemaUrl, schemaName);
      setColumns(columns);

      const rows = await loadSchemaRows(dataUrl, search);
      setRows(rows); 

      setLoading(false);  // 完了

    })();
  }, [schemaUrl, schemaName, dataUrl, search, refresh]);

  // 引数がuseTableData内でのみ存在する関数は、内部関数として処理する
  const deleteRow = async (row) => {
    const deleteUrl = `${dataUrl}${row.id}/`;
    const { res } = await requestApi(deleteUrl, { method: "DELETE" });
    if (res?.ok) {
      onRefresh(); 
    }
  };

  return { columns, rows, loading, deleteRow };
}
