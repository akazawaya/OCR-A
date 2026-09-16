import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { getMe } from "../../api/clients/collectionClient";
import { logout } from "../../api/clients/mutationClient";
import { authActionSpec, routePaths } from "../../appConfig";

import UserMenu from "./UserMenu";

const AuthLayout = () => {
  const queryClient = useQueryClient();
  const logoutBlockerRef = useRef(null);
  const { data, isPending, isFetching } = useQuery({
    queryKey: [authActionSpec.meUrl],
    queryFn: getMe,
    retry: false,
  });

  const { mutate: logoutMutation } = useMutation({
    mutationFn: logout,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [authActionSpec.meUrl],
      });
    },
  });

  const logoutCurrentUser = () => {
    if (logoutBlockerRef.current) {
      // logoutBlockerRefはisEditModeのとき、
      // ViewerPage側からlogoutMutationを受取れる関数として更新される。
      // このとき、ここではlogoutMutationをViewerPageへ渡して処理を代替させる
      logoutBlockerRef.current(logoutMutation);
      return;
    }
    logoutMutation();
  };

  // フェッチ処理中 かつ 非認証の場合、初回の認証試行中と解釈して遷移判断を保留。
  // フェッチ処理中 かつ 認証済みの場合、
  // ViewerPageはQuery Cacheに編集中のデータを保持しており、ここでnullを返すと、
  // ViewerPageがアンマウントされる。その後の再マウント時にwordsが再取得され、
  // 編集中のキャッシュがDBのデータで上書きされる。
  // そのため、この場合はOutletへ処理を進め、アンマウントが発生しないよう区別する。
  if (isPending || (isFetching && !data.authenticated)) return null;

  if (!data.authenticated) {
    return <Navigate to={routePaths.login.to()} replace />;
  }

  return (
    <div className="flex h-full">
      <div className="fixed bottom-2 left-2 z-10">
        <UserMenu
          actions={{ logoutCurrentUser }}
          data={{ email: data.email }}
        />
      </div>
      <div className="flex-1 overflow-auto">
        <Outlet context={{ logoutBlockerRef }} />
      </div>
    </div>
  );
};

export default AuthLayout;
