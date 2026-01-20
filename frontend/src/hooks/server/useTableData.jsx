import { useEffect, useState } from "react";
import { requestApi } from "../../api/requestApi"

async function loadSchemaColumns(schemaUrl, schemaKey) {
  const { data } = await requestApi(schemaUrl);
  const schema = data?.components?.schemas?.[schemaKey];
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

async function loadSchemaRows(routingRowFilter, collectionUrl, search){
  const url = search ? `${collectionUrl}${search}` : collectionUrl
  const { data } = await requestApi(url);
  const  array = Array.isArray(data) ? data : []; 
  const filtered = routingRowFilter ? array.filter(routingRowFilter) : array;
  return filtered;
}

export const useTableData = ({schemaUrl, schemaKey, collectionUrl, search, refresh, onRefresh, routingRowFilter = undefined} = {}) => {
  const [loading, setLoading] = useState(true); //データが“今ロード中かどうか”のフラグ
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true); // 開始

      const columns = await loadSchemaColumns(schemaUrl, schemaKey);
      setColumns(columns);

      const rows = await loadSchemaRows(routingRowFilter, collectionUrl, search);
      setRows(rows); 

      setLoading(false);  // 完了

    })();
  }, [schemaUrl, schemaKey, collectionUrl, search, refresh]);

  // 引数がuseTableData内でのみ存在する関数は、内部関数として処理する
  const deleteRow = async (row) => {
    const deleteUrl = `${collectionUrl}${row.id}/`;
    const { res } = await requestApi(deleteUrl, { method: "DELETE" });
    if (res?.ok) {
      onRefresh(); 
    }
  };

  return { columns, rows, loading, deleteRow };
}
