import DeleteButton from "./DeleteButton/DeleteButton";

export default function MenuTable({
  data = {},
  events: { onClickColumn, onClickRow = null, onClickDeleteButton } = {},
}) {
  const { columns = [], rows = [], loading } = data;

  if (loading) return <div>Loading…</div>;
  return (
    <table>
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
        {rows.map((row) => (
          <tr key={row.id} onClick={onClickRow && (() => onClickRow(row))}>
            {columns.map((c) => (
              <td key={c.key}>{row[c.key]}</td>
            ))}
            {onClickDeleteButton && (
              <td
                key="__delete"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <DeleteButton
                  events={{ onClick: () => onClickDeleteButton(row) }}
                />
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
