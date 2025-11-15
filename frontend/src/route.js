// 変える予定のない変数等を保持するファイル
// URLについてはidで変動するものがあり、静的ではない気がするが
// 暫定としてまとめる

// route.js 

// 画面側(Route)が使う“テンプレート”
export const BASEURL = "http://127.0.0.1:8000/"
export const SCHEMAURL = BASEURL + "schema/"

// parameter取得時のクエリの変数は　new URL(dataUrl).pathnameで自動生成できるらしいが
// エンドポイント情報はここにまとめておきたい

const makeConfig = (schemaName, dataName) =>{
  const dataPath = `/${dataName}/`;
  return{
    schemaUrl: SCHEMAURL,
    schemaName,
    dataName,
    dataPath,
    dataUrl: BASEURL + dataName + "/"
 }
};

export const documentApiConfig = makeConfig("Document", "documents");

export const pageApiConfig = makeConfig("Page", "pages");


export const wordApiConfig = makeConfig("Word", "words");


export const analyzeDocumentApiConfig = {
  analyzeUrl: BASEURL + "documents/analyze/",
};



// 実URL生成器
export const routeTo = Object.freeze({
  docs: () => "/documents",
  docPages: (primaryKey) => `/documents/${encodeURIComponent(primaryKey)}`,
  docPageWords: (foreignKey, primaryKey) =>
    `/documents/${encodeURIComponent(foreignKey)}/pages/${encodeURIComponent(primaryKey)}`,
});
//　useParams で:〇〇 の部分をオブジェクトとして受け取ることができる
