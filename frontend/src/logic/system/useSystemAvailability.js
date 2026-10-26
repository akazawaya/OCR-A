import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { getSystemHealth } from "../../api/clients/collectionClient";
import { logout } from "../../api/clients/mutationClient";
import { SYSTEM_HEALTH_URL } from "../../appConfig";

const HEALTH_CHECK_INTERVAL_MS = 3_000;
const REQUIRED_FAILURE_COUNT = 2;
const REQUIRED_RECOVERY_COUNT = 2;

export const useSystemAvailability = ({ startsUnavailable }) => {
  // "checking"：初回の確認中
  // "available"：正常稼働中
  // "unavailable"：障害発生中
  // "recovered"：サーバーは復旧したが、ログイン画面への復帰処理が未完了
  const [systemStatus, setSystemStatus] = useState(() =>
    startsUnavailable ? "unavailable" : "checking",
  );
  const failureCountRef = useRef(0);
  const recoveryCountRef = useRef(0);
  const healthCheckSequenceRef = useRef(0);
  const queryClient = useQueryClient();

  const healthQuery = useQuery({
    queryKey: [SYSTEM_HEALTH_URL],
    queryFn: async () => {
      healthCheckSequenceRef.current += 1;
      try {
        const data = await getSystemHealth();
        return {
          isHealthy: data?.status === "ok",
          sequence: healthCheckSequenceRef.current,
        };
      } catch {
        return {
          isHealthy: false,
          sequence: healthCheckSequenceRef.current,
        };
      }
    },
    refetchInterval: HEALTH_CHECK_INTERVAL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const {
    isIdle: isLogoutIdle,
    isSuccess: isLogoutSuccess,
    mutate: forceLogout,
    reset: resetLogout,
  } = useMutation({
    mutationFn: logout,
    retry: true,
    retryDelay: HEALTH_CHECK_INTERVAL_MS,
  });

  const shouldBlockAccess =
    systemStatus === "unavailable" || systemStatus === "recovered";

  // ヘルスチェック結果を集計し、障害・復旧状態を更新
  useEffect(() => {
    if (!healthQuery.data) return;
    if (shouldBlockAccess) {
      if (healthQuery.data.isHealthy) {
        recoveryCountRef.current += 1;
        if (recoveryCountRef.current >= REQUIRED_RECOVERY_COUNT) {
          setSystemStatus("recovered");
        }
      } else {
        recoveryCountRef.current = 0;
        setSystemStatus("unavailable");
      }
      return;
    }
    if (healthQuery.data.isHealthy) {
      failureCountRef.current = 0;
      setSystemStatus("available");
      return;
    }
    failureCountRef.current += 1;
    if (failureCountRef.current >= REQUIRED_FAILURE_COUNT) {
      recoveryCountRef.current = 0;
      setSystemStatus("unavailable");
    }
  }, [healthQuery.data, shouldBlockAccess]);

  // アクセス遮断中(shouldBlockAccess)に、ヘルスチェック以外のQueryキャッシュを削除してログアウト
  useEffect(() => {
    if (!shouldBlockAccess) return;
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] !== SYSTEM_HEALTH_URL,
    });
    if (isLogoutIdle) forceLogout();
  }, [forceLogout, isLogoutIdle, queryClient, shouldBlockAccess]);

  // 復旧確認とログアウト完了後、カウンターとMutation状態を初期化して利用可能に戻す
  useEffect(() => {
    if (systemStatus !== "recovered" || !isLogoutSuccess) return;
    failureCountRef.current = 0;
    recoveryCountRef.current = 0;
    resetLogout();
    setSystemStatus("available");
  }, [isLogoutSuccess, resetLogout, systemStatus]);

  return {
    isChecking: systemStatus === "checking",
    shouldBlockAccess,
  };
};
