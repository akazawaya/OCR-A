export const FilterMenu = ({
  data: { conditions = [] } = {},
  events: { onClickSearchButton, onChangeConditions } = {},
}) => {
  return (
    <div className="flex">
      <input
        type="text"
        value={conditions[0].value}
        className="w-fit rounded border border-gray-300 bg-gray-100 p-2 text-left leading-2 text-gray-700 transition-colors duration-200 outline-none focus:border-indigo-500 focus:bg-transparent focus:ring-2 focus:ring-indigo-200"
        onChange={onChangeConditions}
      />
      <button
        className="w-fit cursor-pointer list-none rounded-md bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600"
        onClick={onClickSearchButton}
      >
        検索
      </button>
    </div>
  );
};
