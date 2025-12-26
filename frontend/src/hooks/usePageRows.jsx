import { useEffect, useState } from "react";
import { requestApi } from "../api/requestApi"

async function loadSchemaRows(routingRowFilter, dataUrl, search){
  const url = search ? `${dataUrl}${search}` : dataUrl
  const { data } = await requestApi(url);
  const  array = Array.isArray(data) ? data : []; 
  const filtered = routingRowFilter ? array.filter(routingRowFilter) : array;
  return filtered;
}
export const usePageRows = (routingRowFilter, dataUrl, search) => {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      const rows = await loadSchemaRows(routingRowFilter, dataUrl, search);
      setRows(rows);
    })();
  }, [dataUrl]);

  return rows;
};
