import MenuTable from "../components/MenuTable/MenuTable"
import FileUploader from "../components/FileUploader/FileUploader"
import { FilterMenuButton } from "../components/FilterMenuButton/FilterMenuButton"
import { analyzeDocumentAccessSpec, documentSpec, routePaths, WS_BASE_URL } from "../appConfig";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react"
import { RefreshContext } from "../contexts/refreshContext"
import { useRouting } from "../hooks/routing/useRouting"
import { useFilterState } from "../hooks/ui/useFilterState"
import { useBackendQuery } from "../hooks/server/useBackendQuery"
import { useBackendMutation } from "../hooks/server/useBackendMutation"
import { getCollection } from "../api/clients/collectionClient"
import { analyzeDocument, deleteCollectionItem } from "../api/clients/mutationClient"
import { buildSearch } from "../hooks/server/collectionQuery"

// routePaths.viewer routePaths.docPages 関数として入力しないと即座に実行しようとしてエラーになる
// 方針：prop関数名:実関数を　on(イベントハンドラ):実行される関数、として関係性をここで明記する
// パーツコンポーネントはon(イベントハンドラ)とDOM構築を担当し、hooksは実行される関数を担当。
// お互いがお互いを知らない状態で、Pageコンポーネントでイベントハンドラと実行される関数を結びつける役割を担う。

// ただし、パーツコンポーネント内で完結すべき動作やイベントは外部に出さない
// 例:URLの変更、CRUD,他コンポーネントの表示/挙動に影響する,親の状態やグローバル状態を変える処理は外部に出す
// FilterMenuButtonの開閉コンディション管理は自分自身にのみ関係するので閉じる
// 入力パラメータの保持は、その値を他コンポーネントでも用いる予定なら外部公開にする(onChangeConditionsによる検索条件の表示など？)
const DocumentsPage = () => {
  const { collectionUrl } = documentSpec;
  const { analyzeUrl } = analyzeDocumentAccessSpec;
  const [refresh, onRefresh] = useReducer(n => n + 1, 0);

  const { search, columnsSort, dataRouter } = useRouting({
    routeUrl: (row) => routePaths.viewer(row.id)
  });
  const { conditions, updateConditions } = useFilterState();

  const [appliedConditions, setAppliedConditions] = useState(conditions);
  const applySearch = useCallback(() => setAppliedConditions(conditions), [conditions]);

  const finalSearch = useMemo(
    () => buildSearch({ baseSearch: search, conditions: appliedConditions }),
    [search, appliedConditions]
  );

  const { data: rows, isLoading: rowsLoading } = useBackendQuery({
    queryKey: ["collection", collectionUrl, finalSearch ?? "", refresh],
    queryFn: () => getCollection({ collectionUrl, search: finalSearch }),
    enabled: Boolean(collectionUrl),
    initialData: [],
  });

  const { mutate: deleteRowMutation } = useBackendMutation({
    mutationFn: ({ id }) => deleteCollectionItem({ collectionUrl, id }),
    onSuccess: () => onRefresh(),
  });
  const deleteRow = useCallback((row) => deleteRowMutation({ id: row.id }), [deleteRowMutation]);
  
  const { mutate: analyzeMutation } = useBackendMutation({
    mutationFn: ({ formData }) => analyzeDocument({ analyzeUrl, formData }),
    onSuccess: () => onRefresh(),
  });
  
  const inputRef = useRef(null);
  const analyzeData = useCallback(() => {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      alert("ファイルを選択してください");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    analyzeMutation({ formData }).catch(() => {});
  }, [analyzeMutation]);
  
  const documentColumns = documentSpec.ui.table.map(({ key, label }) => ({ key, label }));
  
  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE_URL}documents/`);
    ws.onmessage = () => onRefresh();
    return () => ws.close();
  }, [onRefresh]);

  return (
    <RefreshContext.Provider value={onRefresh}>
    <p>DocumentsPage</p>

    <FilterMenuButton 
      data={{search, conditions}}
      navigation={{onClickSearchButton:applySearch}}
      options={{onChangeConditions:updateConditions}}/>

    <FileUploader 
      data={{inputRef}} 
      options={{onClickAnalyzeButton:analyzeData}}/>

    <MenuTable 
      data={{ columns:documentColumns, rows, loading: rowsLoading }}
      navigation={{
        onClickColumn:columnsSort,
        onClickRow:dataRouter,
      }}
      options={{
        onClickDeleteButton:deleteRow,
      }}
      />
    </RefreshContext.Provider>
  )
}
export default DocumentsPage
