import { fetchBackend } from "../fetchBackend";

export async function analyzeDocument({ analyzeUrl, formData }) {
  const { res, data } = await fetchBackend(analyzeUrl, {
    method: "POST",
    body: formData,
    throwOnError: true,
  });
  return { res, data };
}

export async function patchCollectionItem({ collectionUrl, id, body }) {
  const url = `${collectionUrl}${id}/`;
  const { res, data } = await fetchBackend(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    throwOnError: true,
  });
  return { res, data };
}

export async function deleteCollectionItem({ collectionUrl, id }) {
  const url = `${collectionUrl}${id}/`;
  const { res } = await fetchBackend(url, { method: "DELETE", throwOnError: true });
  return res;
}

