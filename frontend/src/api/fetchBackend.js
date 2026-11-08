import { authActionSpec } from "../appConfig";

const buildHttpError = ({ res, data, url }) => {
  const error = new Error(`HTTP Error:${res.status}`);
  error.name = "HttpError";
  error.status = res.status;
  error.data = data;
  error.url = url;
  return error;
};

const getCsrfToken = () => {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrftoken="))
    ?.split("=")[1];
};

const ensureCsrfToken = async () => {
  let csrfToken = getCsrfToken();
  if (csrfToken) return csrfToken;

  await fetch(authActionSpec.csrfUrl, {
    credentials: "include",
  });

  csrfToken = getCsrfToken();
  if (!csrfToken) throw new Error("CSRF token cookie was not set.");
  return csrfToken;
};

export const fetchBackend = async (url, options = {}) => {
  const { throwOnError = false, ...fetchOptions } = options;

  try {
    const csrfToken = await ensureCsrfToken();
    const headers = {
      Accept: "application/json",
      "X-CSRFToken": csrfToken,
      ...(fetchOptions.headers ?? {}),
    };

    const res = await fetch(url, {
      credentials: "include",
      ...fetchOptions,
      headers,
    });
    const data = res.status === 204 ? null : await res.json();

    if (!res.ok) {
      throw buildHttpError({ res, data, url });
    }

    return { res, data, error: null };
  } catch (e) {
    if (throwOnError) throw e;
    return { res: null, data: null, error: e };
  }
};
