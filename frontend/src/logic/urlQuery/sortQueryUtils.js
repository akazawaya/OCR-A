export const toggleSortQuery = (sortQuery = {}, orderingField) => {
  const orderingValue = sortQuery?.ordering;

  if (orderingValue === orderingField) {
    return { ordering: `-${orderingField}` };
  }

  if (orderingValue === `-${orderingField}`) {
    return { ordering: "" };
  }

  return { ordering: orderingField };
};
