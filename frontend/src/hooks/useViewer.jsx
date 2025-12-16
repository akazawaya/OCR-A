import { useEffect, useState } from "react";
import { requestApi } from "../api/requestApi";

const loadRowsAndImgs = async (dataUrl, search) => {
  const url = search ? `${dataUrl}${search}` : dataUrl
  const { data } = await requestApi(url); (dataUrl, search);
  const arr = Array.isArray(data) ? data : [];  
  const filtered = routingRowFilter ? arr.filter(routingRowFilter) : arr;
  return filtered;
}


export const useViewer = () => {
  const [rows, setRows] = useState([]);
  const [imgs, setImgs] = useState([]);
  
  useEffect(() => {
  (async () => {
    const filtered = loadRowsAndImgs = (dataUrl, search);
    setRows(filtered);
    setImgs(filtered);
  })();
  }, []);
  return {rows, imgs};
}