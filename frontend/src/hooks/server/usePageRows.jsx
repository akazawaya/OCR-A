import { useEffect, useState } from "react";
import { requestApi } from "../../api/requestApi"

async function loadSchemaRows({ collectionUrl, search, routingRowFilter = undefined } = {}) {
  const url = search ? `${collectionUrl}${search}` : collectionUrl
  const { data } = await requestApi(url);
  const  array = Array.isArray(data) ? data : []; 
  const filtered = typeof routingRowFilter === "function" ? array.filter(routingRowFilter) : array;
  return filtered;
}
export const usePageRows = ({ collectionUrl, search, routingRowFilter } = {}) => {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      const rows = await loadSchemaRows({ collectionUrl, search, routingRowFilter });
      setRows(rows);
    })();
  }, [collectionUrl, search, routingRowFilter]);

  return rows;
};
