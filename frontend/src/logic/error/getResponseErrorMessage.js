export const getResponseErrorMessage = (errorData, fallbackMessage) => {
  const messages = Object.values(errorData ?? {}).flat();
  return messages.length > 0 ? messages.join(" ") : fallbackMessage;
};
