import { fetchBackend } from "../fetchBackend";

export const getCollection = async ({ collectionUrl, queryString }) => {
  const url = queryString ? `${collectionUrl}${queryString}` : collectionUrl;
  const { data } = await fetchBackend(url);
  return data;
};
