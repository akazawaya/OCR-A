import { ArrowDownUp, ArrowDown, ArrowUp } from "lucide-react";

const DocumentTable = ({
  data: { columns = [], rows = [], ordering = "" } = {},
  actions: { columnsSort, dataRouter = null, deleteRow } = {},
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
                onClick={() => columnsSort(c.key)}
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
        {rows.map((r) => {
          const isRowClickable = Boolean(dataRouter) && r.state === "完了";

          return (
            <tr
              key={r.id}
              aria-disabled={!isRowClickable}
              className={
                isRowClickable
                  ? "cursor-pointer border border-gray-400 hover:bg-gray-200"
                  : "cursor-not-allowed border border-gray-400 text-gray-500"
              }
              onClick={isRowClickable ? () => dataRouter(r) : undefined}
            >
              {columns.map((c) => (
                <td key={c.key} className="border border-gray-400 px-1">
                  {c.format ? c.format(r[c.key]) : r[c.key]}
                </td>
              ))}
              {deleteRow && (
                <td
                  key="__delete"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <button
                    className="w-fit cursor-pointer bg-red-500 text-white hover:bg-red-600"
                    onClick={() => deleteRow(r)}
                  >
                    削除
                  </button>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default DocumentTable;
