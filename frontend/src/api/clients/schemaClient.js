import { fetchBackend } from "../fetchBackend";

export const getSchema = async ({ schemaUrl, schemaKey }) => {
  const { data } = await fetchBackend(schemaUrl);
  return data.components.schemas[schemaKey];
};
