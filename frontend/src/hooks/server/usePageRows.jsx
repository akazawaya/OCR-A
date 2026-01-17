import { useEffect, useState } from "react";
import { requestApi } from "../../api/requestApi"

async function loadSchemaRows({ dataUrl, search, routingRowFilter = undefined } = {}) {
  const url = search ? `${dataUrl}${search}` : dataUrl
  const { data } = await requestApi(url);
  const  array = Array.isArray(data) ? data : []; 
  const filtered = typeof routingRowFilter === "function" ? array.filter(routingRowFilter) : array;
  return filtered;
}
export const usePageRows = ({ dataUrl, search, routingRowFilter } = {}) => {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      const rows = await loadSchemaRows({ dataUrl, search, routingRowFilter });
      setRows(rows);
    })();
  }, [dataUrl, search, routingRowFilter]);

  return rows;
};
