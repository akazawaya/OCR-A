import { FilterMenu } from "./FilterMenu/FilterMenu";

export function FilterMenuButton({
  data: { search, conditions } = {},
  events: { onClickSearchButton, onChangeConditions } = {},
} = {}) {
  return (
    <details className="mx-auto flex w-fit flex-col items-center">
      <summary className="w-fit cursor-pointer list-none rounded-md bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600">
        検索メニュー
      </summary>

      <div className="m-2">
        <FilterMenu
          data={{ search, conditions }}
          events={{ onClickSearchButton, onChangeConditions }}
        />
      </div>
    </details>
  );
}
