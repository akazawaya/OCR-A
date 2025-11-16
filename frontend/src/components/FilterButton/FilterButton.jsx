// search機能をテストするコンポーネント
// 理想はSearchButton→Dialogによるpopup→filterによるsearch命令をbackendと連携→既存Tableの内容を更新
//　検索機能はクエリパラメータ(URL末尾の?以降)をクエリに付け足すことで実行可能（backendでの許可が前提）
// よって、fetchのGETリクエストの延長として実装できる


// 2.実際にfetchのreqを送信し、resを受け取る
// 3.既存Tableに反映
import { useState } from "react";
import { requestApi } from "../../api/requestApi";

// 1.backendを読み取って、filterで許可されているフィールドを動的に取得　UIとして組み立てる
// 1.1 filterの情報を所得
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
        // 不本意だが、①ソート用のDjangoFilterBackendで"ordering"が紛れ込むのを無視
        // ②OpneAPIの使用でexactがlookupから省略されるのをハンドリングする　フロント部で行う（まだ）
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


//1.2 UIの組み立て 対象フィールド名ごとにinputを生成、　ルックアップはプルダウンで選択式
const FilterMenu = ({ filters }) => {
  return (
    <div>
      {filters.map(f => (
        <div key={f.fieldName}>
          <label>{f.fieldName}</label>

          <input type="text" />

          <select defaultValue={f.lookups[0]}>
            {f.lookups.map(lk => (
              <option key={lk} value={lk}>
                {lk}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
};

export function FilterButton({ config }) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState([]); //バックエンドから取ってきたフィルター定義の保持

  const handleFilter = async () => {
    if (filters.length === 0) {
      const result = await getFilterConfig(config);
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
        <FilterMenu filters={filters} />
      </div>
    </div>
  );
}

