// src/components/Table.jsx
import { useEffect, useState } from "react";
import DeleteButton from "../DeleteButton/DeleteButton";

// fetchのresponse→OpenAPI仕様（specification）をjsonで取得
async function loadSchemaColumns(schemaUrl, schemaName) {
  const res = await fetch(schemaUrl,
                    {headers: { Accept: "application/json" }});
  if (!res.ok) throw new Error(`schema HTTP ${res.status}`);
  const spec = await res.json(); //ここからプロパティ参照できるようになる

	//間に?を挟むとerror等の例外処理を回避（undefinedを返す)ので安全にエラーハンドリングが可能
  const schema = spec?.components?.schemas?.[schemaName];//変数は角括弧記法でないといけない
	if (!schema?.properties) {
  	const reason =
    	spec?.components?.schemas == null
      	? "components.schemas not found"
      	: `${schemaName} schema not found or has no properties`;
 		 throw new Error(reason);
	}

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

export default function Table({config:{schemaUrl, schemaName, dataUrl}}) {
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        //スキーマから列を自動生成
        const columns = await loadSchemaColumns(schemaUrl, schemaName);
        setColumns(columns);

        //データ本体を取得
        const res = await fetch(dataUrl,
                    {headers: { Accept: "application/json" }}); 
        const json = await res.json();
        setRows(Array.isArray(json) ? json : [json]); //カラの時のハンドリングを兼ねる
				
      } catch (e) {
        setErr(e.message);
      }
    })();
  }, []);

  if (err) return <div role="alert">{err}</div>;
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
          <tr key={row.id}>
            {columns.map(c => (
            	<td key={c.key}>{row[c.key]}</td>
          	))}<td><DeleteButton deleteByIdUrl={`${dataUrl}${row.id}/`} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
// まだ実体験が伴わないが、reactはkeyでノード関係を識別するため
// 要素の差分更新をする際には必須らしい