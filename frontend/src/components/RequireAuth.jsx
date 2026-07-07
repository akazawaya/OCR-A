import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet } from "react-router-dom";

import { getMe } from "../api/clients/collectionClient";
import { authActionSpec, routePaths } from "../appConfig";

const RequireAuth = () => {
  const { data, isPending } = useQuery({
    queryKey: [authActionSpec.meUrl],
    queryFn: getMe,
    retry: false,
  });

  if (isPending) return null;

  if (!data.authenticated) {
    return <Navigate to={routePaths.login.to()} replace />;
  }

  return <Outlet />;
};

export default RequireAuth;
