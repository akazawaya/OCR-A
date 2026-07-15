import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "lucide-react";

import { routePaths, userSpec } from "../../appConfig";

const AppSidebar = ({
  data: { username: _username },
  events: { onClickLogoutButton },
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const username = userSpec.ui.username.format(_username);
  return (
    <div className="absolute m-2">
      <button
        aria-label={"サイドバー開閉ボタン"}
        className="absolute z-10 flex h-10 w-10 items-center justify-center rounded-md bg-gray-300 hover:bg-gray-400"
        onClick={() => setIsOpen((current) => !current)}
      >
        <User />
      </button>

      {isOpen && (
        <div className="z-9 flex w-48 flex-col rounded-md bg-gray-200 p-3 pt-12">
          <p>{username}</p>
          <button
            className="hover:text-gray-400"
            onClick={() => navigate(routePaths.docs.to())}
          >
            トップページ
          </button>
          <button
            className="hover:text-gray-400"
            onClick={() => onClickLogoutButton()}
          >
            ログアウト
          </button>
        </div>
      )}
    </div>
  );
};

export default AppSidebar;
