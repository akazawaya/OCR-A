import DeleteButton from "../DeleteButton/DeleteButton"

export default function Table({
  data:{columns, rows, ordering} = {},
  navigation:{onColumnClick, onRowClick = null, onSearch} = {}, 
  options:{showDeleteButton = false, onDeleteRow} = {},
                          }) {

  if (!ordering) return <div>Loading…</div>;
  return (
    <table>
      <thead>
        <tr>
          {columns.map(c => (
            <th key={c.key} onClick={() => onColumnClick(c.key)}>
              {c.label}
            </th>
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