import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "lucide-react";

import { routePaths } from "../../appConfig";

const UserMenu = ({ data: { email }, events: { onClickLogoutButton } }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <div>
      <div className="flex w-60 items-center gap-1">
        <button
          aria-label={"ユーザーメニュー開閉ボタン"}
          className="flex size-12 shrink-0 items-center justify-center rounded-md bg-gray-200 hover:bg-gray-400"
          onClick={() => setIsOpen((current) => !current)}
        >
          <User />
        </button>
        <div className={`w-full ${isOpen ? "break-all" : "truncate"}`}>
          {email}
        </div>
      </div>
      {isOpen && (
        <div className="absolute bottom-full flex w-full flex-col rounded-md bg-gray-200 p-3">
          <button
            className="hover:text-gray-400"
            onClick={() => navigate(routePaths.docs.to())}
          >
            トップページ
          </button>
          <button
            className="hover:text-gray-400"
            onClick={() => navigate(routePaths.setting.to())}
          >
            アカウント設定
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

export default UserMenu;
