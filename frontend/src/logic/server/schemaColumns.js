// buildColumnDefsFromSchema: schema/properties/requiredという材料を”組み立てて”列定義（descriptor）配列を作る
// (type: スキーマのタイプ, properties: 各フィールドの定義, required: 必須フィールド名の配列)
// 長いし、Column(列)という名称がtable作成時に被りそうだが、抽象的にして訳が分からなくなるのが嫌なので明示を優先する
export const buildColumnDefsFromSchema = (schema) => {
  if (!schema?.properties) return [];
  const props = schema.properties;
  // requiredのバリデーション 配列か否かを確認するのが良いらしい→Parameter Object の required: true/false（真偽値）も存在するため
  const required = Array.isArray(schema.required) ? schema.required : [];
  // 並びを[必須(required),その他(others)]に変更（元の出現順がわからなければ名前順 ）
  const allKeys = Object.keys(props);
  const others = allKeys.filter((k) => !required.includes(k)).sort();
  const ordered = [...required, ...others];
  return ordered.map((key) => ({ key, label: key })); // 列定義を返す
};
