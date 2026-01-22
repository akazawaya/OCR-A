export function applyFilter(array, predicate) {
  return typeof predicate === "function" ? array.filter(predicate) : array;
}
