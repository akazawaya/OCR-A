export const buildPaginationQuery = (page) => ({
  page: page === 1 ? null : page,
});
