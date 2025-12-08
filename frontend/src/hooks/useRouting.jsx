import { useLocation, useNavigate, useParams } from "react-router-dom";
import { routeTo } from "../route";


// currentOrderingを　なし→　+　→　-　→　解除の流れで記入
const toggleOrdering = (current, field) => {
  if (current === field) return `-${field}`; 
  else if (current === `-${field}`) return ""; 
  else return field;   // なしor別フィールド → 昇順開始
}
export const useRouting = () => {
  const navigate = useNavigate();
  const { search } = useLocation(); // search === "?ordering=file_name"という search プロパティを抽出　 {}は分割代入として一致するプロパティを抜き出せる
  // location{ pathname: "/documents", search: "?ordering=file_name",hash: "",state: null,key: "abc123"}
  const { primaryKey } = useParams() // { primaryKey: "123" }

  const queryParams = new URLSearchParams(search || ""); //ordering = "file_name"
  const ordering = queryParams.get("ordering") || ""; // "file_name"

  const routingRowFilter = 
    primaryKey !== "undefined"
      ? (row) => row.page === Number(primaryKey)
      : undefined;

  const columnsSort = (field) => { // orderingを引数にすると、子がorderingを把握する必要が出るため書かない
    const next = toggleOrdering(ordering, field);
    const params = new URLSearchParams(search); //ordering = "file_name"

    if (next) params.set("ordering", next);
    else params.delete("ordering");
    navigate({ search: params.toString() });
  };

  const dataRouter = (row) => {
    navigate(routeTo.ocr(row.id));
  };

  const applySearchFilter = (nextSearch) => {
    navigate({ search: nextSearch });
  };

  return { search, columnsSort, dataRouter, routingRowFilter, applySearchFilter };
}