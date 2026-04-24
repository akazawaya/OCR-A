const readUploadErrorMessage = (error) => {
  const data = error?.data;

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (typeof data?.file?.[0] === "string") {
    return data.file[0];
  }

  if (typeof error?.message === "string") {
    return error.message;
  }

  return "";
};

export const getUploadErrorMessage = (error) => {
  const message = readUploadErrorMessage(error);
  if (message) return message;

  if (typeof error?.status === "number") {
    return `アップロードに失敗しました (HTTP ${error.status})`;
  }

  return "アップロードに失敗しました";
};
