import { Navigate, Outlet, useLocation } from "react-router-dom";

import { routePaths } from "../../appConfig";
import { useSystemAvailability } from "../../logic/system/useSystemAvailability";
import SystemUnavailablePage from "../../pages/SystemUnavailablePage";

// useSystemAvailabilityの結果に即して表示可能なルートを制御する層
const SystemAvailabilityLayout = () => {
  const location = useLocation();
  const isViewingUnavailablePage =
    location.pathname === routePaths.systemUnavailable.to();
  const { isChecking, shouldBlockAccess } = useSystemAvailability({
    startsUnavailable: isViewingUnavailablePage,
  });

  if (isChecking) return null;

  if (shouldBlockAccess && !isViewingUnavailablePage) {
    return <Navigate to={routePaths.systemUnavailable.to()} replace />;
  }

  if (shouldBlockAccess) return <SystemUnavailablePage />;

  if (isViewingUnavailablePage) {
    return <Navigate to={routePaths.login.to()} replace />;
  }

  return <Outlet />;
};

export default SystemAvailabilityLayout;
