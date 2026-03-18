/**
 * useRouting.js
 *
 * 責務:
 * - react-router-domに関わる　URL状態とその操作のための変数/関数を提供する。
 * - 変数としてURL状態に関わる値の提供を行う。
 * - 関数としてナビゲーションやフィルタリング操作のユーティリティを提供する。
 *
 * @param {object} [options]
 * - 拡張性と他hooksと型をそろえる意図から、引数もオブジェクト型にしたが、
 * 　routeUrlしか受け取らず、これ以外に何かを追加することも思いつかないので
 * 　単一引数にしても良いかもしれない
 *
 * @param {(resource: { id: string|number }) => string} [options.routeUrl]
 * - resource から遷移先のURL（path）を生成する関数。未指定なら dataRouter は作られない。
 *
 * @returns {object} result
 *
 * @property {string} result.search
 * - URLのクエリ文字列（例: "?ordering=field"）
 *
 * @property {string | undefined} result.primaryKey
 * - URLパスのprimaryKeyパラメータ。
 * - 該当パスでのみ定義され、存在しない場合はundefined
 *
 * @property {(field: string) => void} result.columnsSort
 * - イベントハンドラから実行可能なfunction
 *   URLクエリorderingをトグル更新し、一覧の並び替え条件を変更する。
 *   同一フィールドを連続指定した場合: `field`（昇順）→ `-field`（降順）→ 解除（ordering削除）。
 * - 別フィールドを指定した場合: そのフィールドの昇順から開始する。
 *
 * @property {((resource: { id: string|number }) => void) | undefined} result.dataRouter
 * - イベントハンドラから実行可能なfunction
 * 　文字通りルーティングを実行する
 */

import { useCallback, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

//　orderingValueの現在の値を、素のorderingFieldと比較して、
// 「未指定 → 昇順 → 降順 → 解除」の順にトグルする関数

const toggleOrdering = (orderingValue, orderingField) => {
  if (orderingValue === orderingField) return `-${orderingField}`;
  else if (orderingValue === `-${orderingField}`) return "";
  else return orderingField; // なしor別フィールド → 昇順開始
};

export const useRouting = ({ routeUrl } = {}) => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { primaryKey } = useParams();
  // useLocation()/useParams()はが返すオブジェクトは、複数プロパティを持つため、分割代入の{}で、必要なプロパティのみを取得する

  const columnsSort = useCallback(
    (orderingField) => {
      // 破壊的操作(set,delete)を行うため、クロージャとは個別にparamsを作成
      const queryParams = new URLSearchParams(search || "");
      const currentOrderingValue = queryParams.get("ordering") || "";

      const nextOrderingValue = toggleOrdering(
        currentOrderingValue,
        orderingField,
      );
      if (nextOrderingValue) queryParams.set("ordering", nextOrderingValue);
      else queryParams.delete("ordering");

      navigate({ search: queryParams.toString() }, { replace: true });
    },
    [search, navigate],
  );

  const dataRouter = useMemo(
    () => (routeUrl ? (resource) => navigate(routeUrl(resource)) : undefined),
    [routeUrl, navigate],
  );

  return {
    search,
    primaryKey,
    columnsSort,
    dataRouter,
  };
};
