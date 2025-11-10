// src/components/Table.jsx
import { useEffect, useState } from "react";
import DeleteButton from "../DeleteButton/DeleteButton";
import { requestApi } from "../../api/requestApi";

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

export default function Table({config:{schemaUrl, schemaName, dataUrl},
                              refresh,
                              rowFilter,
                              showDeleteButton = false,
                              onRowClick = null
                            }) {
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      //スキーマから列を自動生成
      const columns = await loadSchemaColumns(schemaUrl, schemaName);
      setColumns(columns);
        //データ本体を取得
      const { data }  = await requestApi(dataUrl); 
      const arr = Array.isArray(data) ? data : [];  
      const filtered = rowFilter ? arr.filter(rowFilter) : arr;
      setRows(filtered); //カラの時のハンドリングを兼ねる

    })();
  }, [refresh]);

  if (!columns.length) return <div>Loading…</div>;
	
  return (
    <table>
      <thead>
        <tr>
          {columns.map(c => (
            <th key={c.key}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.id} onClick={onRowClick && (() => onRowClick(row))} >
            {columns.map(c => (
            	<td key={c.key}>{row[c.key]}</td>
          	))}
            {showDeleteButton && (
              <td key="__delete">
                <DeleteButton deleteByIdUrl={`${dataUrl}${row.id}/`} />
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>  
  );
}
// &&は||の逆で、左オペラント自身がTrueの時に右辺を返す
// <td key="__">はただの識別キーに過ぎない
// idは同じ親の直下に並ぶ兄弟内でユニークであればいいので、
// DeleteButtonのidは変数でなくて良い