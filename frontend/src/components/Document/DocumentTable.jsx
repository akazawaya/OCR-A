import { ArrowDownUp, ArrowDown, ArrowUp } from "lucide-react";

const DocumentTable = ({
  data: { columns = [], rows = [], ordering = "" } = {},
  events: { onClickColumn, onClickRow = null, onClickDeleteButton } = {},
}) => {
  const buildSortIcon = (ordering, columnKey) => {
    const className = "h-[1em] w-[1em]";

    if (ordering === columnKey) return <ArrowUp className={className} />;
    if (ordering === `-${columnKey}`)
      return <ArrowDown className={className} />;
    return <ArrowDownUp className={className} />;
  };
  return (
    <table className="mx-auto">
      <thead>
        <tr>
          {columns.map((c) => {
            return (
              <th
                key={c.key}
                className="cursor-pointer border border-gray-400 px-1 hover:bg-gray-200"
                onClick={() => onClickColumn(c.key)}
              >
                <span className="flex items-center justify-between gap-1">
                  {c.label}
                  {buildSortIcon(ordering, c.key)}
                </span>
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
                {c.format ? c.format(r[c.key]) : r[c.key]}
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
