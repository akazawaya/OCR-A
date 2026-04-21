import { fetchBackend } from "../fetchBackend";

export const getCollection = async ({ collectionUrl, queryString }) => {
  const url = queryString ? `${collectionUrl}${queryString}` : collectionUrl;
  const { data } = await fetchBackend(url);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
};
