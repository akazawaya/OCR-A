import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useBackendQuery({ queryKey, queryFn, enabled = true, initialData }) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // queryKey は「変わったら再取得」のトリガー。配列/文字列を想定
  const key = useMemo(() => {
    if (Array.isArray(queryKey)) return JSON.stringify(queryKey);
    return String(queryKey);
  }, [queryKey]);

  // queryFn は毎renderで変わりうるので ref に退避（Effect依存に入れない）
  const queryFnRef = useRef(queryFn);
  useEffect(() => {
    queryFnRef.current = queryFn;
  }, [queryFn]);

  // 競合（古いリクエストの遅延解決）を捨てるためのID
  const requestIdRef = useRef(0);

  const run = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await queryFnRef.current();
      if (requestId !== requestIdRef.current) return; // 古い結果は捨てる
      setData(result);
      return result;
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setError(e instanceof Error ? e : new Error(String(e)));
      //　instanceof:はその値が指定したクラス（コンストラクタ）のインスタンスかを判別する
      throw e;
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
      // 並列状態を許容するため、Idが一致（最新）の時だけLoadingをfalseにする
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    run();
  }, [key, enabled, run]);

  return { data, error, isLoading, refetch: run };
}
