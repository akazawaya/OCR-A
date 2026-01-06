import MenuTable from "../components/MenuTable/MenuTable"
import FileUploader from "../components/FileUploader/FileUploader"
import { FilterMenuButton } from "../components/FilterMenuButton/FilterMenuButton"
import { analyzeDocumentApiConfig, documentConfig } from "../route"
import { routeTo } from "../route";

import { useReducer } from "react"
import { RefreshContext } from "../contexts/refreshContext"
import { useTableData } from "../hooks/useTableData"
import { useRouting } from "../hooks/useRouting"
import { useAnalyze } from "../hooks/useAnalyze"
import { useFilter } from "../hooks/useFilter"

// routeTo.viewer routeTo.docPages 関数として入力しないと即座に実行しようとしてエラーになる
// 方針：prop関数名:実関数を　on(イベントハンドラ):実行される関数、として関係性をここで明記する
// パーツコンポーネントはon(イベントハンドラ)とDOM構築を担当し、hooksは実行される関数を担当。
// お互いがお互いを知らない状態で、Pageコンポーネントでイベントハンドラと実行される関数を結びつける役割を担う。

// ただし、パーツコンポーネント内で完結すべき動作やイベントは外部に出さない
// 例:URLの変更、CRUD,他コンポーネントの表示/挙動に影響する,親の状態やグローバル状態を変える処理は外部に出す
// FilterMenuButtonの開閉コンディション管理は自分自身にのみ関係するので閉じる
// 入力パラメータの保持は、その値を他コンポーネントでも用いる予定なら外部公開にする(onChangeConditionsによる検索条件の表示など？)
const DocumentsPage = () => {
  const { schemaUrl, schemaName, dataUrl } = documentConfig;
  const { analyzeUrl } = analyzeDocumentApiConfig;
  const [refresh, onRefresh] = useReducer(n => n + 1, 0);

  const { search, columnsSort, dataRouter, routingRowFilter, searchFilter } = useRouting({
    routeUrl: (row) => routeTo.viewer(row.id)
  });
  
  const { rows, loading, deleteRow } = useTableData({schemaUrl, schemaName, dataUrl, search, refresh, onRefresh, routingRowFilter});
  
  const { inputRef, analyzeData } = useAnalyze(analyzeUrl, onRefresh);
  const { conditions, updateConditions, applySearchFilter} = useFilter(search, searchFilter)
  const documentColumns = documentConfig.ui.table.map(({ key, label }) => ({ key, label }));

  return (
    <RefreshContext.Provider value={onRefresh}>
    <p>DocumentsPage</p>

    <FilterMenuButton 
      data={{search, conditions}}
      navigation={{onSearchButtonClick:applySearchFilter}}
      options={{onChangeConditions:updateConditions}}/>

    <FileUploader 
      data={{inputRef}} 
      options={{onAnalyzeButtonClick:analyzeData}}/>

    <MenuTable 
      data={{ columns:documentColumns, rows, loading }}
      navigation={{
        onColumnClick:columnsSort,
        onRowClick:dataRouter,
      }}
      options={{
        onDeleteButtonClick:deleteRow,
      }}
      />
    </RefreshContext.Provider>
  )
}
export default DocumentsPage