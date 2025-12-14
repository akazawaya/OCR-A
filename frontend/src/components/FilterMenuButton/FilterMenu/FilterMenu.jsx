import { useState } from "react";
// UI(簡易版)　仮でpages__words__contentに対し　icontainsで検索を実行(固定)
// 将来的に複数条件を扱えるようにconditionは配列にしているが、需要がないかもしれない
// onSearch propを使って親（page)にURLを渡す
export const FilterMenu = ({
  data:{search},
  options:{onSearchButtonClick, onChangeConditions} 
  }) => {

  const [conditions, setConditions] = useState([
    {fieldName: "pages__words__content", lookup: "icontains",value: ""},
  ]);  
    // ③ 入力が変わったら state を更新
    // eはブラウザのイベントオブジェクト(event.target.valueで値が読めるのはDOM標準仕様！！)　それをreactがラップして参照可能にしている
    // いままでのonCilckでもeは参照可能だったが、無視して省略していた
  const updateConditions = (e) => {
    const value = e.target.value;
    setConditions(prev => [{ ...prev[0], value },]);
    onChangeConditions(value);
  };
  
  const makeNextSearch = () => {
    const queryParams = new URLSearchParams(search); // URLSearchParamsを使うとエンコードや&=の取付を自動化してくれるらしい
    const c = conditions[0]; // condition配列の最初のみを暫定的に対象とする
    
    const key = c.lookup === "exact" ? c.fieldName: `${c.fieldName}__${c.lookup}`;
    if (c.value) {
      queryParams.set(key, c.value);
   } else {
    queryParams.delete(key)};

    const nextQueryString = queryParams.toString();
    const nextSearch = nextQueryString ? `?${nextQueryString}` : "";
    // ここで location.search が変わる → DocumentsPage で searchDataUrl 更新
     onSearchButtonClick?.(nextSearch); // ← 暫定的にPageに次のsearchだけ渡す
  };

  return (
    <div>
      <input type="text" value={conditions[0].value} 
              onChange={updateConditions} />
      <button  onClick={makeNextSearch} >検索実行</button>
    </div>
  );
};