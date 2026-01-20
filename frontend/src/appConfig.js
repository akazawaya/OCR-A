export const API_BASE_URL = "http://127.0.0.1:8000/"
export const OPENAPI_URL = API_BASE_URL + "schema/"

const makeConfig = ({schemaKey, collection}) =>{
  const collectionPath = `/${collection}/`; 
  // ↑オブジェクトリテラル内に書かないのは、return以下はこれから作るプロパティに過ぎず、
  // 外側スコープに存在しないcollectionPathの参照がcollectionUrlで不可能になるため
  return {
    schemaUrl: OPENAPI_URL,
    schemaKey,
    collection,
    collectionPath,
    collectionUrl: API_BASE_URL + collectionPath
 }
};

export const documentApiConfig = makeConfig({ schemaKey: "Document", collection: "documents" });
export const pageApiConfig = makeConfig({ schemaKey: "Page", collection: "pages" });
export const wordApiConfig = makeConfig({ schemaKey: "Word", collection: "words" });

export const analyzeDocumentApiConfig = {
  analyzeUrl: API_BASE_URL + "documents/analyze/",
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
