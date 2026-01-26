import { fetchBackend } from "../fetchBackend";

export async function getSchema({ schemaUrl, schemaKey }) {
  const { data } = await fetchBackend(schemaUrl);
  const schema = data?.components?.schemas?.[schemaKey] ?? null;
  return schema;
}

