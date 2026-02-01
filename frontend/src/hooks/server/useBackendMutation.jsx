import { useCallback, useEffect, useRef, useState } from "react";

export function useBackendMutation({ mutationFn, onSuccess, onError, initialData }) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const mutationFnRef = useRef(mutationFn);
  useEffect(() => {
    mutationFnRef.current = mutationFn;
  }, [mutationFn]);

  const requestIdRef = useRef(0);

  const mutate = useCallback(
    async (variables) => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      setError(null);

      try {
        const result = await mutationFnRef.current(variables);
        if (requestId !== requestIdRef.current) return undefined;
        setData(result);
        if (onSuccess) onSuccess(result, variables);
        return result;
      } catch (e) {
        if (requestId !== requestIdRef.current) return undefined;
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        if (onError) onError(err, variables);
        throw e;
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    },
    [onSuccess, onError]
  );

  return { data, error, isLoading, mutate };
}
