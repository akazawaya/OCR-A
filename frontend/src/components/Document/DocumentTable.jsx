import { SortIcon } from "../ui/SortIcon";

const DocumentTable = ({
  data: { columns = [], rows = [], ordering = "" } = {},
  actions: { columnsSort, dataRouter = null, deleteRow } = {},
}) => {
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
                  <SortIcon columnKey={c.key} ordering={ordering} />
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
