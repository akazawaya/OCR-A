import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, Outlet } from "react-router-dom";

import { getMe } from "../../api/clients/collectionClient";
import { logout } from "../../api/clients/mutationClient";
import { authActionSpec, routePaths } from "../../appConfig";

import UserMenu from "./UserMenu";

const AuthLayout = () => {
  const queryClient = useQueryClient();
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

  if (isPending) return null;

  if (!data.authenticated) {
    return <Navigate to={routePaths.login.to()} replace />;
  }

  return (
    <div className="flex h-full">
      <div className="fixed bottom-2 left-2 z-10">
        <UserMenu
          data={{ username: data.username }}
          events={{ onClickLogoutButton: logoutMutation }}
        />
      </div>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AuthLayout;
