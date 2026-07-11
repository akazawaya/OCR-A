import { fetchBackend } from "../fetchBackend";
import { authActionSpec, userAccessSpec } from "../../appConfig";

export const postCollection = async ({ collectionUrl, body }) => {
  const { res, data } = await fetchBackend(collectionUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    throwOnError: true,
  });
  return { res, data };
};

export const patchCollectionItem = async ({ collectionUrl, id, body }) => {
  const url = `${collectionUrl}${id}/`;
  const { res, data } = await fetchBackend(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    throwOnError: true,
  });
  return { res, data };
};

export const deleteCollectionItem = async ({ collectionUrl, id }) => {
  const url = `${collectionUrl}${id}/`;
  const { res } = await fetchBackend(url, {
    method: "DELETE",
    throwOnError: true,
  });
  return res;
};

// document用API createとocrの違いは呼び出し元が渡すURLで決まる。
export const postFormData = async ({ url, formData }) => {
  const { res, data } = await fetchBackend(url, {
    method: "POST",
    body: formData,
    throwOnError: true,
  });
  return { res, data };
};

// previewWord用API このAPIはジョブ登録のみ行い、
// 結果回収は ws通知を契機に Redis cache の GET APIであるgetPreviewWordOcrResult で行う。
// 返り値の preview_job_id は、そのイベントが自分のジョブかどうかを照合するために使う。
export const ocrPreviewWord = async ({ actionUrl, previewWord, mode, doc }) => {
  const { data } = await fetchBackend(actionUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode,
      preview_id: previewWord.id,
      doc,
      page_number: previewWord.page__page_number,
      bbox: previewWord.bbox,
    }),
    throwOnError: true,
  });
  return data.preview_job_id;
};

export const login = async ({ username, password }) => {
  const { data } = await fetchBackend(authActionSpec.loginUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    throwOnError: true,
  });

  return data;
};

export const logout = async () => {
  const { res } = await fetchBackend(authActionSpec.logoutUrl, {
    method: "POST",
    throwOnError: true,
  });

  return res;
};

export const createUser = async () => {
  const { data } = await fetchBackend(userAccessSpec.collectionUrl, {
    method: "POST",
    throwOnError: true,
  });

  return data;
};

export const deleteCurrentUser = async () => {
  const { res } = await fetchBackend(`${userAccessSpec.collectionUrl}me/`, {
    method: "DELETE",
    throwOnError: true,
  });

  return res;
};
