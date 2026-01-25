import { useCallback, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

// currentOrderingを　なし→　+　→　-　→　解除の流れで記入
//　これだけuseRoutingの責務としては正しくないかもしれない?
const toggleOrdering = (current, field) => {
  if (current === field) return `-${field}`; 
  else if (current === `-${field}`) return ""; 
  else return field;   // なしor別フィールド → 昇順開始
}

export const useRouting = ({routeUrl, rowSelector} = {}) => {
  const navigate = useNavigate();
  const { search } = useLocation(); 
  // search === "?ordering=file_name"という search プロパティを抽出　 {}は分割代入として一致するプロパティを抜き出せる
  // location{ pathname: "/documents", search: "?ordering=file_name",hash: "",state: null,key: "abc123"}
  const { primaryKey } = useParams() // { primaryKey: "123" }

  const routingRowFilter = useMemo(() => (
    primaryKey != null && typeof rowSelector === "function"
      ? (row) => rowSelector(row) === Number(primaryKey)
      : undefined
    ), [primaryKey, rowSelector]);

  // orderingを引数にすると、子がorderingを把握する必要が出るため書かない 
  const columnsSort = useCallback((field) => { 
    // 破壊的操作(set,delete)を行うため、クロージャとは個別にparamsを作成
    const current = new URLSearchParams(search || "");
    const currentOrdering = current.get("ordering") || "";

    const next = toggleOrdering(currentOrdering, field);
    if (next) current.set("ordering", next);
    else current.delete("ordering");

    navigate({ search: current.toString()}, { replace: true });
  },[search, navigate]);

  const dataRouter = useMemo(() => (
    routeUrl ? (row) => navigate(routeUrl(row))
    : undefined
  ), [routeUrl, navigate]);

  const searchFilter = useCallback((nextSearch) => {
    navigate({ search: nextSearch });
  }, [navigate]);

  const buildSearch = useCallback((patch = {}) => {
    // patch=クエリパラメータの差分(変更したいもの)key:valueで { page__doc: 123, doc: null }ならpage__doc=123を入れてdocは消す
    const params = new URLSearchParams(search || "");
    // patchオブジェクトを[key, value]のペア配列に変換
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === undefined || v === "") params.delete(k);
      else params.set(k, String(v)); //追加と上書きを兼ねる
    }
    const s = params.toString();
    return s ? `?${s}` : "";
  }, [search]);

  return {
    primaryKey,  
    search,
    buildSearch,
    columnsSort,
    dataRouter,
    routingRowFilter,
    searchFilter,
  };
}