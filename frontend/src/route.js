// 変える予定のない変数等を保持するファイル
// URLについてはidで変動するものがあり、静的ではない気がするが
// 暫定としてまとめる

// route.js 

// 画面側(Route)が使う“テンプレート”
export const BASEURL = "http://127.0.0.1:8000/"
export const SCHEMAURL = BASEURL + "schema/"



export const routes = {
  HOME: "/",
  RESULT: "/result/",
}  