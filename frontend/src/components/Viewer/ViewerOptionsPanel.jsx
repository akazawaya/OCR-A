export const ViewerOptionsPanel = ({
  data: { columns = [], visibleColumnKeys = [] } = {},
  events: { onChangeColumnVisibility } = {},
} = {}) => {
  return (
    <div className="absolute top-full right-1 z-3 mt-1 rounded-md border bg-gray-200 p-3">
      <div>テーブルの表示項目</div>
      <div className="flex flex-col gap-1">
        {columns.map((column) => {
          const isVisible = visibleColumnKeys.includes(column.key);
          return (
            <label key={column.key} className="flex items-center gap-1">
              <input
                aria-label={column.label}
                checked={isVisible}
                type="checkbox"
                onChange={(event) =>
                  onChangeColumnVisibility(column.key, event.target.checked)
                }
              />
              {column.label}
            </label>
          );
        })}
      </div>
    </div>
  );
};
