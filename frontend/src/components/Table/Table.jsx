import DeleteButton from "../DeleteButton/DeleteButton";

const onColumnClick = ({ field, query, onSearch }) => {
// URLSearchParamsでqueryを受け取る

  const queryParams = new URLSearchParams(query || "");
  // "?ordering=file_name&page=2"に対してgetするとfile_nameが帰ってくる]
  // params.set("ordering", "-file_name"); すると書き込みが行われる
  // params.delete("ordering"); 全部消える
  const current = queryParams.get("ordering");

  // currentを　なし→　+　→　-　→　解除の流れで記入
  // 
  let next;
  if (current === field) {
    next = `-${field}`; 
  } else if (current === `-${field}`) {
    next = ""; 
  } else {
    next = field;   // なしor別フィールド → 昇順開始
  }

  //params.set deleteを設定（nextが存在するならそれに変更する）
  if (next) queryParams.set("ordering", next);
  else queryParams.delete("ordering");

  const qs = queryParams.toString();
  const nextSearch = qs ? `?${qs}` : "";
  onSearch(nextSearch);
};

export default function Table({
    fetchBase:{schemaUrl, schemaName, dataUrl},
    fetchFlow:{refresh, query},
    navigation:{onRowClick = null, onSearch } = {}, 
    options:{showDeleteButton = false, rowSelector, onDeleteRow } = {},
    data:{columns, rows}
                            }) {

  //if (!columns.length) return <div>Loading…</div>;
	
  return (
    <table>
      <thead>
        <tr>
          {columns.map(c => (
            <th key={c.key} onClick={() => onColumnClick({ field: c.key, query, onSearch })}
              > {c.label} </th>
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
              <td key="__delete" onClick={(e) => {e.stopPropagation()}}> 
                <DeleteButton onDelete={() => onDeleteRow?.(row)} />
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

// stopPropagation は伝搬を止めるという意味で、この場合　e.type → "click"を対象とし、
// tdのさらに親のtrにclickが伝搬されなくなる