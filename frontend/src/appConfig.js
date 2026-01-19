// 変える予定のない変数等を保持するファイル
// URLについてはidで変動するものがあり、静的ではない気がするが
// 暫定としてまとめる

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
  viewer: (primaryKey) => `/documents/${encodeURIComponent(primaryKey)}/viewer`,
  docPageWords: (foreignKey, primaryKey) =>
    `/documents/${encodeURIComponent(foreignKey)}/pages/${encodeURIComponent(primaryKey)}`,
});
//　useParams で:〇〇 の部分をオブジェクトとして受け取ることができる


// columnsの翻訳兼,見せる要素の指定 分離が可能なようにapiConfigにui要素を追加
const withUi = (apiConfig, ui = {}) => ({
  ...apiConfig,ui: Object.freeze(ui),
});

export const docUi = Object.freeze({
  table: [
    { key: "created", label: "作成日時" },
    { key: "file_name", label: "名前" },
  ],
});

export const wordUi = Object.freeze({
  table: [
    { key: "page__page_number", label: "ページ" },
    { key: "content", label: "本文" },
  ],
});


// ApiConfig+Ui機能→Configという命名　もっといい命名があるかもしてない
export const documentConfig = withUi(documentApiConfig, docUi);
export const wordConfig = withUi(wordApiConfig, wordUi);