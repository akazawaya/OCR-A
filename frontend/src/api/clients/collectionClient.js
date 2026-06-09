import { fetchBackend } from "../fetchBackend";
import { wordOcrAccessSpec } from "../../appConfig";

export const getCollection = async ({ collectionUrl, queryString }) => {
  const url = queryString ? `${collectionUrl}${queryString}` : collectionUrl;
  const { data } = await fetchBackend(url);
  return data;
};

export const getPreviewWordOcrResult = async ({ previewJobId }) => {
  const { data } = await fetchBackend(
    wordOcrAccessSpec.resultUrl(previewJobId),
  );
  return data;
};
