import { useState } from "react";

export const useFilterState = () => {
  const [conditions, setConditions] = useState([
    {fieldName: "pages__words__content", lookup: "icontains",value: ""},
  ]);  
    // ③ 入力が変わったら state を更新
    // eはブラウザのイベントオブジェクト(event.target.valueで値が読めるのはDOM標準仕様！！)　それをreactがラップして参照可能にしている
    // いままでのonCilckでもeは参照可能だったが、無視して省略していた

  const updateConditions = (e) => {
    const value = e.target.value;
    setConditions(prev => [{ ...prev[0], value },]);
    //onChangeConditions(value);　外部参照を有効化する時に使う
  };
  return { conditions, updateConditions };
}
