const buildHttpError = ({ res, data, url }) => {
  const error = new Error(`HTTP Error:${res.status}`);
  error.name = "HttpError";
  error.status = res.status;
  error.data = data;
  error.url = url;
  return error;
};

export const fetchBackend = async (url, options = {}) => {
  const { throwOnError = false, ...fetchOptions } = options;
  const headers = {
    Accept: "application/json",
    ...(fetchOptions.headers ?? {}),
  };

  try {
    const res = await fetch(url, { ...fetchOptions, headers });
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
