import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "lucide-react";

import { routePaths } from "../../appConfig";

const AppSidebar = ({
  data: { username },
  events: { onClickLogoutButton },
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <div className="absolute m-2">
      <div className="flex items-center gap-1">
        <button
          aria-label={"サイドバー開閉ボタン"}
          className="z-10 flex h-10 w-10 items-center justify-center rounded-md bg-gray-300 hover:bg-gray-400"
          onClick={() => setIsOpen((current) => !current)}
        >
          <User />
        </button>
        <div className={`w-28 ${isOpen ? "break-all" : "truncate"}`}>
          {username}
        </div>
      </div>
      {isOpen && (
        <div className="z-9 flex w-48 flex-col rounded-md bg-gray-200 p-3">
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
