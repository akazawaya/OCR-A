import { fetchBackend } from "../fetchBackend";

export const getSchema = async ({ schemaUrl, schemaKey }) => {
  const { data } = await fetchBackend(schemaUrl);
  const schema = data?.components?.schemas?.[schemaKey] ?? null;
  return schema;
};
