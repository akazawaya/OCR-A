import { fetchBackend } from "../fetchBackend";

export const postCollectionItem = async ({ collectionUrl, body }) => {
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

export const postDocument = async ({ collectionUrl, formData }) => {
  const { res, data } = await fetchBackend(collectionUrl, {
    method: "POST",
    body: formData,
    throwOnError: true,
  });
  return { res, data };
};

export const startOcrDocument = async ({ startOcrUrl, formData }) => {
  const { res, data } = await fetchBackend(startOcrUrl, {
    method: "POST",
    body: formData,
    throwOnError: true,
  });
  return { res, data };
};

export const ocrPreviewByPreviewWord = async ({
  ocrPreviewUrl,
  previewWord,
  mode,
  doc,
}) => {
  const { res, data } = await fetchBackend(ocrPreviewUrl, {
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
  return { res, data };
};
