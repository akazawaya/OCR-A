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

// currentOrderingを　なし→　+　→　-　→　解除の流れで記入
const toggleOrdering = (current, field) => {
  if (current === field) return `-${field}`;
  else if (current === `-${field}`) return "";
  else return field; // なしor別フィールド → 昇順開始
};

export const useRouting = ({ routeUrl } = {}) => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { primaryKey } = useParams();

  // orderingを引数にすると、子がorderingを把握する必要が出るため書かない
  const columnsSort = useCallback(
    (field) => {
      // 破壊的操作(set,delete)を行うため、クロージャとは個別にparamsを作成
      const current = new URLSearchParams(search || "");
      const currentOrdering = current.get("ordering") || "";

      const next = toggleOrdering(currentOrdering, field);
      if (next) current.set("ordering", next);
      else current.delete("ordering");

      navigate({ search: current.toString() }, { replace: true });
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
