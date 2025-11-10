// 変える予定のない変数等を保持するファイル
// URLについてはidで変動するものがあり、静的ではない気がするが
// 暫定としてまとめる

// route.js 

// 画面側(Route)が使う“テンプレート”
export const BASEURL = "http://127.0.0.1:8000/"
export const SCHEMAURL = BASEURL + "schema/"

export const documentSchemaConfig = {
  schemaUrl: SCHEMAURL,
  schemaName: "Document",
  dataUrl: BASEURL + "documents/",
};

export const pageSchemaConfig = {
  schemaUrl: SCHEMAURL,
  schemaName: "Page",
  dataUrl: BASEURL + "pages/",
};

export const wordSchemaConfig = {
  schemaUrl: SCHEMAURL,
  schemaName: "Word",
  dataUrl: BASEURL + "words/",
};

export const analyzeDocumentSchemaConfig = {
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
