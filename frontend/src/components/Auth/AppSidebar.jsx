import { useNavigate } from "react-router-dom";

import { routePaths, userSpec } from "../../appConfig";

const AppSidebar = ({
  data: { username: _username },
  events: { onClickLogoutButton },
}) => {
  const navigate = useNavigate();
  const username = userSpec.ui.username.format(_username);
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
