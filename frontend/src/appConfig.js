export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export const WS_BASE_URL = API_BASE_URL.replace("http", "ws");
export const OPENAPI_URL = API_BASE_URL + "schema/";
// 目的
// OpenAPI（components/schemas）から型情報（schema）を動的に参照できる様にして、
// REST の collection endpointに対して操作を行うための情報をまとめる。

// 変数の命名規則
// schema: OpenAPI由来の設計図 (metadata)
// collection: REST由来のcollection endpoint情報（data の入口）
// spec: specification（仕様・契約） 上記を包含するspecは双方どちらにも依った用語ではない

// 関数の命名規則
// makeFoo: ルールベースで一意に決まるもの
// attachFoo: 何かを束ねるとき

const makeAccessSpec = ({ schemaKey, collection }) => {
  const collectionPath = `${collection}/`;
  // ↑オブジェクトリテラル内に書かないのは、return以下はこれから作るプロパティに過ぎず、
  // 外側スコープに存在しないcollectionPathの参照がcollectionUrlで不可能になるため
  return {
    schemaUrl: OPENAPI_URL,
    schemaKey,
    collection,
    collectionPath,
    collectionUrl: API_BASE_URL + collectionPath,
  };
};

export const documentAccessSpec = makeAccessSpec({
  schemaKey: "Document",
  collection: "documents",
});
export const pageAccessSpec = makeAccessSpec({
  schemaKey: "Page",
  collection: "pages",
});
export const wordAccessSpec = makeAccessSpec({
  schemaKey: "Word",
  collection: "words",
});
export const documentOcrAccessSpec = {
  startOcrUrl: API_BASE_URL + "documents/ocr/",
};

export const wordOcrAccessSpec = {
  ocrPreviewUrl: API_BASE_URL + "words/ocr-preview/",
};

// 表示するフィールド/列を選ぶ（表示名の翻訳も兼ねる）
const documentUiSpec = Object.freeze({
  table: [
    { key: "created", label: "作成日時" },
    { key: "file_name", label: "名前" },
    { key: "state", label: "状態" },
  ],
});
const wordUiSpec = Object.freeze({
  table: [{ key: "content" }],
});

// attachResourceSpec:accessSpec（入口）と uiSpec（表示定義）を束ねる
// Resourceはrestに則った名称
// 粒度で言えば返り値はcollectionに近いが、「外側が表す対象単位」として上位概念のresourceを採用する
const attachResourceSpec = (accessSpec, uiSpec = {}) => ({
  ...accessSpec,
  ui: Object.freeze(uiSpec),
});

export const documentSpec = attachResourceSpec(
  documentAccessSpec,
  documentUiSpec,
);
export const wordSpec = attachResourceSpec(wordAccessSpec, wordUiSpec);

// routePaths（ルーティングに使うパス）
// template:React Routerのdynamic paramsを用いた抽象URL。App.jsx の <Route path=...> に渡して定義に使う。
// to: 遷移先URLを生成する関数。Link の to や navigate() に渡す具体URLを作る。
export const routePaths = Object.freeze({
  docs: {
    template: "/documents",
    to: () => "/documents",
  },
  viewer: {
    template: "/documents/:primaryKey/viewer",
    to: (primaryKey) => `/documents/${encodeURIComponent(primaryKey)}/viewer`,
  },
});
