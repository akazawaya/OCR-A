export default function DocumentTable({
  data = {},
  events: { onClickColumn, onClickRow = null, onClickDeleteButton } = {},
}) {
  const { columns = [], rows = [] } = data;

  return (
    <table className="mx-auto">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} onClick={() => onClickColumn(c.key)}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} onClick={onClickRow && (() => onClickRow(r))}>
            {columns.map((c) => (
              <td key={c.key}>{r[c.key]}</td>
            ))}
            {onClickDeleteButton && (
              <td
                key="__delete"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <button onClick={() => onClickDeleteButton(r)}>削除</button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
