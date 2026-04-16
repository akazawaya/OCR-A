/**
 * @property {(field: string) => void} result
 * - イベントハンドラから実行可能なfunction
 *   URLクエリorderingをトグル更新し、一覧の並び替え条件を変更する。
 *   同一フィールドを連続指定した場合: `field`（昇順）→ `-field`（降順）→ 解除（ordering削除）。
 * - 別フィールドを指定した場合: そのフィールドの昇順から開始する。
 *
 */
export const toggleOrdering = (orderingValue, orderingField) => {
  if (orderingValue === orderingField) return `-${orderingField}`;
  else if (orderingValue === `-${orderingField}`) return "";
  else return orderingField; // なしor別フィールド → 昇順開始
};
