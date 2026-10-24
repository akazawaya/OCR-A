import { fetchBackend } from "../fetchBackend";
import {
  wordOcrAccessSpec,
  authActionSpec,
  SYSTEM_HEALTH_URL,
} from "../../appConfig";

export const getSystemHealth = async () => {
  const { data } = await fetchBackend(SYSTEM_HEALTH_URL, {
    throwOnError: true,
  });

  return data;
};

export const getCollectionItem = async ({ collectionUrl, id }) => {
  const { data } = await fetchBackend(`${collectionUrl}${id}/`);
  return data;
};
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

export const getMe = async () => {
  const { data } = await fetchBackend(authActionSpec.meUrl, {
    throwOnError: true,
  });

  return data;
};
