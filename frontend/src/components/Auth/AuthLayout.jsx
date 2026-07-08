import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet } from "react-router-dom";

import { getMe } from "../../api/clients/collectionClient";
import { authActionSpec, routePaths } from "../../appConfig";

import AppSidebar from "./AppSidebar";

const AuthLayout = () => {
  const { data, isPending } = useQuery({
    queryKey: [authActionSpec.meUrl],
    queryFn: getMe,
    retry: false,
  });

  if (isPending) return null;

  if (!data.authenticated) {
    return <Navigate to={routePaths.login.to()} replace />;
  }

  return (
    <div className="flex h-full min-h-0">
      <AppSidebar user={data} />
      <main className="min-w-0 flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AuthLayout;
