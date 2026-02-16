import { fetchBackend } from "../fetchBackend";

export async function getCollection({ collectionUrl, search }) {
  const url = search ? `${collectionUrl}${search}` : collectionUrl;
  const { data } = await fetchBackend(url);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}
