import { fetchBackend } from "../fetchBackend";

export async function getCollection({ collectionUrl, queryString }) {
  const url = queryString ? `${collectionUrl}${queryString}` : collectionUrl;
  const { data } = await fetchBackend(url);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}
