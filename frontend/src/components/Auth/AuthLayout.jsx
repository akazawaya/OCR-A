import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, Outlet } from "react-router-dom";

import { getMe } from "../../api/clients/collectionClient";
import { logout } from "../../api/clients/mutationClient";
import { authActionSpec, routePaths } from "../../appConfig";

import AppSidebar from "./AppSidebar";

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
    <div>
      <AppSidebar
        data={{ username: data.username }}
        events={{ onClickLogoutButton: logoutMutation }}
      />
      <main className="min-w-0 flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AuthLayout;
