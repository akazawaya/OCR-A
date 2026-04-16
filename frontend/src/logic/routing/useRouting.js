/**
 * useRouting.js
 *
 * 責務:
 * - react-router-domに関わる　URL状態とその操作のための変数/関数を提供する。
 * - 変数としてURL状態に関わる値の提供を行う。
 * - 関数としてナビゲーションを提供する。
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
 * @property {string} result.locationSearch
 * - URLのクエリ文字列（例: "?ordering=field"）
 *
 * @property {string | undefined} result.primaryKey
 * - URLパスのprimaryKeyパラメータ。
 * - 該当パスでのみ定義され、存在しない場合はundefined
 *
 * @property {((resource: { id: string|number }) => void) | undefined} result.dataRouter
 * - イベントハンドラから実行可能なfunction
 * 　文字通りルーティングを実行する
 */

import { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

// locationSearch は URI の ? 以降の query string 全体を表す。
// keyword などの検索条件だけでなく、ordering などの並び替え条件も含む。
export const useRouting = ({ routeUrl } = {}) => {
  const navigate = useNavigate();
  const { search: locationSearch } = useLocation();
  const { primaryKey } = useParams();

  const dataRouter = useMemo(
    () => (routeUrl ? (resource) => navigate(routeUrl(resource)) : undefined),
    [routeUrl, navigate],
  );

  return {
    locationSearch,
    primaryKey,
    dataRouter,
  };
};
