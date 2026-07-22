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
  const { data, isPending } = useQuery({
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

  const handleLogoutClick = () => {
    if (logoutBlockerRef.current) {
      // logoutBlockerRefはisEditModeのとき、
      // ViewerPage側からlogoutMutationを受取れる関数として更新される。
      // このとき、ここではlogoutMutationをViewerPageへ渡して処理を代替させる
      logoutBlockerRef.current(logoutMutation);
      return;
    }
    logoutMutation();
  };

  if (isPending) return null;

  if (!data.authenticated) {
    return <Navigate to={routePaths.login.to()} replace />;
  }

  return (
    <div className="flex h-full">
      <div className="fixed bottom-2 left-2 z-10">
        <UserMenu
          data={{ email: data.email }}
          events={{ onClickLogoutButton: handleLogoutClick }}
        />
      </div>
      <div className="flex-1 overflow-auto">
        <Outlet context={{ logoutBlockerRef }} />
      </div>
    </div>
  );
};

export default AuthLayout;
