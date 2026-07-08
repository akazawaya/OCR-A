import { useNavigate } from "react-router-dom";

import { routePaths } from "../../appConfig";

const AppSidebar = ({
  data: { username },
  events: { onClickLogoutButton },
}) => {
  const navigate = useNavigate();
  return (
    <div>
      <div>{username}</div>
      <button onClick={() => navigate(routePaths.docs.to())}>
        トップページ
      </button>
      <button onClick={() => onClickLogoutButton()}>ログアウト</button>
    </div>
  );
};

export default AppSidebar;
