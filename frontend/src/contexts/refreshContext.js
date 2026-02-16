import { createContext, useContext } from "react";
// 前提として、useReducer(atate,dispatch)が定義されている
// useContextではProvider(<Context.Provider>がuseReducerのdispatch（= 更新ハンドラ）を、
// 親ツリーから子のコンポーネントに配布して、
// 子のどのコンポーネントからでもアクセス可能にする

export const RefreshContext = createContext(() => {});
// Refresh というデータを共有する箱（型）
//() => {}は何もしない関数の既定値
// <RefreshContext.Provider value={onRefresh}> のように上位で包むと
// 配下でuseRefresh() が使える

export const useRefresh = () => useContext(RefreshContext);
// 親のProvider で配ったvalue（ここでは ハンドラ関数onRefresh）を、コンポーネントのツリー配下のどこでも取り出せる“窓口”
// valueが変わると、配下でuseContextしているコンポーネントは再レンダリングされる
// ※jsでは関数も値　first-class value　である

// 子でconst onRefresh = useRefresh();を宣言し
// 成功時 onRefresh();を行うことで再レンダリングされる
