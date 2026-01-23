export function buildColumnDefsFromSchema(schema) {
  if (!schema?.properties) return [];
  const props = schema.properties;
  const required = Array.isArray(schema.required) ? schema.required : [];
  const allKeys = Object.keys(props);
  const others = allKeys.filter((key) => !required.includes(key)).sort();
  const ordered = [...required, ...others];
  return ordered.map((key) => ({ key, label: key }));
}
