const DocumentTable = ({
  data: { columns = [], rows = [], ordering = "" } = {},
  events: { onClickColumn, onClickRow = null, onClickDeleteButton } = {},
}) => {
  const buildSortMark = (ordering, columnKey) => {
    if (ordering === columnKey) return "▲";
    if (ordering === `-${columnKey}`) return "▼";
    return "⇅";
  };
  return (
    <table className="mx-auto">
      <thead>
        <tr>
          {columns.map((c) => {
            const sortMark = buildSortMark(ordering, c.key);
            return (
              <th
                key={c.key}
                className="cursor-pointer border border-gray-400 px-1 hover:bg-gray-200"
                onClick={() => onClickColumn(c.key)}
              >
                {c.label} {sortMark}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.id}
            className="cursor-pointer border border-gray-400 hover:bg-gray-200"
            onClick={onClickRow && (() => onClickRow(r))}
          >
            {columns.map((c) => (
              <td key={c.key} className="border border-gray-400 px-1">
                {r[c.key]}
              </td>
            ))}
            {onClickDeleteButton && (
              <td
                key="__delete"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <button
                  className="w-fit cursor-pointer bg-red-500 text-white hover:bg-red-600"
                  onClick={() => onClickDeleteButton(r)}
                >
                  削除
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default DocumentTable;
