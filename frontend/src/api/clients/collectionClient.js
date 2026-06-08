import { fetchBackend } from "../fetchBackend";
import { wordOcrAccessSpec } from "../../appConfig";

export const getCollection = async ({ collectionUrl, queryString }) => {
  const url = queryString ? `${collectionUrl}${queryString}` : collectionUrl;
  const { data } = await fetchBackend(url);
  return data;
};

export const getWordOcrResult = async ({ previewJobId }) => {
  const { data } = await fetchBackend(
    wordOcrAccessSpec.makeOcrResultUrl(previewJobId),
  );
  return data;
};
