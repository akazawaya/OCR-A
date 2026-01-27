import { useCallback, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

// currentOrderingを　なし→　+　→　-　→　解除の流れで記入
//　これだけuseRoutingの責務としては正しくないかもしれない?
const toggleOrdering = (current, field) => {
  if (current === field) return `-${field}`; 
  else if (current === `-${field}`) return ""; 
  else return field;   // なしor別フィールド → 昇順開始
}

export const useRouting = ({routeUrl} = {}) => {
  const navigate = useNavigate();
  const { search } = useLocation(); 
  // search === "?ordering=file_name"という search プロパティを抽出　 {}は分割代入として一致するプロパティを抜き出せる
  // location{ pathname: "/documents", search: "?ordering=file_name",hash: "",state: null,key: "abc123"}
  const { primaryKey } = useParams() // { primaryKey: "123" }


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


  return {
    primaryKey,  
    search,
    columnsSort,
    dataRouter,
  };
}
