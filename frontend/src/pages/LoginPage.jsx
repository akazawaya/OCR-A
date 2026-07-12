import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { createUser, login } from "../api/clients/mutationClient";
import { routePaths } from "../appConfig";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const { mutate: loginMutation } = useMutation({
    mutationFn: () => login({ username, password }),
    onSuccess: () => {
      navigate(routePaths.docs.to());
    },
    onError: () => {
      toast.error("ログインに失敗しました", {
        position: "top-center",
        classNames: {
          toast: "!border !border-red-300 !bg-red-50 !text-red-800 ",
          title: "!font-semibold !text-red-800",
          description: "!text-red-700",
        },
      });
    },
  });

  const { mutate: createUserMutation } = useMutation({
    mutationFn: () => createUser(),
    onSuccess: () => {
      navigate(routePaths.docs.to());
    },
    onError: () => {
      toast.error("ログインに失敗しました", {
        position: "top-center",
        classNames: {
          toast: "!border !border-red-300 !bg-red-50 !text-red-800 ",
          title: "!font-semibold !text-red-800",
          description: "!text-red-700",
        },
      });
    },
  });

  return (
    <div className="mt-20 flex flex-col items-center">
      <label>
        ユーザー名
        <input
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
      </label>

      <label>
        パスワード
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      <button onClick={() => loginMutation()}>ログイン</button>

      <button onClick={() => createUserMutation()}>
        ゲストユーザーでログイン
      </button>

      <p>アカウントをお持ちでない方は</p>
      <button onClick={() => navigate(routePaths.signup.to())}>新規登録</button>
    </div>
  );
};

export default LoginPage;
