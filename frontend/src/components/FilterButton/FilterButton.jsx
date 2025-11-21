//　検索機能はクエリパラメータ(URL末尾の?以降)をクエリに付け足すことで実行可能（backendでの許可が前提）
// よって、fetchのGETリクエストの延長として実装できる
import { useState } from "react";
import { requestApi } from "../../api/requestApi";
import { useLocation } from "react-router-dom";

// 1.backendを読み取って、filterで許可されているフィールドを動的に取得　UIとして組み立てる(未使用) とりあえず残しておく
// parametersとは,openAPI的にクライアントが渡してよい入力値を示す
const getFilterConfig = async ({ schemaUrl, dataPath }) => {
      const { data } = await requestApi(schemaUrl);
      const parameters = data.paths?.[dataPath]?.get?.parameters ?? []
      // django-filterの仕様として’name’プロパティに(HTTP の入力名)に検索・フィルタリングを詰めている
      const group = new Map(); // fieldNameとlookUpの組を [{fieldName:"a", lookups:[b,c]},{...}]みたいに作成して格納する
      // new Map() はキー付きの箱（辞書） []は順番つきのリスト(配列) 今回はキーに従い組を格納するのでMapを使う
      // m.set("key", {a:b,c:d})で入力 m.get("key")で出力
      // Mapインスタンスの操作はメソッドで行うのでドット記法等は使えない if文には.hasを使おう
      for (const p of parameters) {// pythonでいうin のfor文はofで作成(inもkey列挙用に使う時もある)
        
        const name = p.name; 
        // ①ソート用のDjangoFilterBackendで"ordering"が紛れ込むのを無視
        // OpneAPIの仕様でexactがlookupから省略されるのをハンドリングするのはバックエンドで行うこととした
        if (name === "ordering") continue;
        const idx = name.lastIndexOf("__"); //"__"が最後に出現した位置のインデックスを返す  -1→（"__" が無い）
        // "file_name__icontains"なら9　"_"ではなく"__" のインデックスなのに注意 

        const fieldName = idx === -1
          ? name: name.slice(0, idx); // "__" より前　0以上idx未満
        const lookUp = idx === -1
          ? "exact": name.slice(idx + 2); // "__ より後　※__は2文字でn番目のインデックスなので無視するとなるとn+2以上から始める

        if(!group.has(fieldName)){group.set(fieldName, {fieldName, lookups: [] })};
        const lookup = group.get(fieldName);
        if(!lookup.lookups.includes(lookUp)){
          lookup.lookups.push(lookUp);
        }}   

      const filters = Array.from(group.values()); // mapで繰り返しができるように配列に変換
  return filters;
};

// UI(簡易版)　仮でpages__words__contentに対し　icontainsで検索を実行(固定)
// 将来的に複数条件を扱えるようにconditionは配列にしているが、需要がないかもしれない
// onSearch propを使って親（page)にURLを渡す
const FilterMenu = ({currentQueryString, onSearch }) => {
  const [conditions, setConditions] = useState([
    {fieldName: "pages__words__content", lookup: "icontains",value: ""},
  ]);  
    // ③ 入力が変わったら state を更新
    // eはブラウザのイベントオブジェクト(event.target.valueで値が読めるのはDOM標準仕様！！)　それをreactがラップして参照可能にしている
    // いままでのonCilckでもeは参照可能だったが、無視して省略していた
  const handleChange = (e) => {
    const value = e.target.value;
    setConditions(prev => [{ ...prev[0], value },]);
  };
  
  const handleClick = () => {
    const queryParams = new URLSearchParams(currentQueryString); // URLSearchParamsを使うとエンコードや&=の取付を自動化してくれるらしい
    const c = conditions[0]; // condition配列の最初のみを暫定的に対象とする
    
    const key = c.lookup === "exact" ? c.fieldName: `${c.fieldName}__${c.lookup}`;
    if (c.value) {
      queryParams.set(key, c.value);
   } else {
    queryParams.delete(key)};

    const nextQueryString = queryParams.toString();
    const nextSearch = nextQueryString ? `?${nextQueryString}` : "";
    // ここで location.search が変わる → DocumentsPage で searchDataUrl 更新
    onSearch?.(nextSearch) // ← 暫定的にPageに次のsearchだけ渡す
  };

  return (
    <div>
      <input type="text" value={conditions[0].value} 
        onChange={handleChange} />
      <button  onClick={handleClick} >検索実行</button>
    </div>
  );
};


export function FilterButton({config:{schemaUrl, dataPath },
                              currentQueryString, onSearch}) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState([]); //バックエンドから取ってきたフィルター定義の保持(未使用)

  const handleFilter = async () => {
    if (filters.length === 0) {
      const result = await getFilterConfig({ schemaUrl, dataPath });
      setFilters(result);
    }
    setOpen(prev => !prev);
  };

  return (
    <div>
      <button type="button" onClick={handleFilter}>
        検索メニュー
      </button>

      <div style={{ display: open ? "block" : "none" }}>
      <FilterMenu currentQueryString={currentQueryString} onSearch={onSearch}/>
      </div>
    </div>
  );
}

