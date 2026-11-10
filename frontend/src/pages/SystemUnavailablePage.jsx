import { TriangleAlert } from "lucide-react";

import AppLogo from "../components/AppLogo";
import { pageClassNames } from "../components/ui/classNames";

const SystemUnavailablePage = () => (
  <div className={`${pageClassNames.panel} text-center`}>
    <AppLogo />
    <TriangleAlert
      aria-hidden="true"
      className="mx-auto size-14 text-amber-400"
    />
    <div className="text-xl font-bold">現在サービスを利用できません</div>
    <p className="text-base">時間を置いて再度お試しください。</p>
  </div>
);

export default SystemUnavailablePage;
