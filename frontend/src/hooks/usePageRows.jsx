import { useEffect, useState } from "react";
import { requestApi } from "../api/requestApi"

async function loadSchemaRows({ dataUrl, search, routingRowFilter = undefined} = {}){
  const url = search ? `${dataUrl}${search}` : dataUrl
  const { data } = await requestApi(url);
  const  array = Array.isArray(data) ? data : []; 
  const filtered = typeof routingRowFilter === "function" ? array.filter(routingRowFilter) : array;
  return filtered;
}
export const usePageRows = (routingRowFilter = null, dataUrl, search) => {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      const rows = await loadSchemaRows(routingRowFilter, dataUrl, search);
      setRows(rows);
    })();
  }, [dataUrl]);

  return rows;
};
