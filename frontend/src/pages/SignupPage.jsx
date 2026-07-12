import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { createUser } from "../api/clients/mutationClient";
import { routePaths } from "../appConfig";

const SignupPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const navigate = useNavigate();

  const { mutate: createUserMutation } = useMutation({
    mutationFn: () =>
      createUser({
        type: "registered",
        username,
        password,
      }),
    onSuccess: () => {
      navigate(routePaths.docs.to());
    },
    onError: () => {
      toast.error("アカウント作成に失敗しました", {
        position: "top-center",
        classNames: {
          toast: "!border !border-red-300 !bg-red-50 !text-red-800 ",
          title: "!font-semibold !text-red-800",
          description: "!text-red-700",
        },
      });
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();

    if (password !== passwordConfirmation) {
      toast.error("パスワードが一致しません", {
        position: "top-center",
        classNames: {
          toast: "!border !border-red-300 !bg-red-50 !text-red-800 ",
          title: "!font-semibold !text-red-800",
          description: "!text-red-700",
        },
      });
      return;
    }

    createUserMutation();
  };

  return (
    <form onSubmit={handleSubmit}>
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

      <label>
        パスワード確認
        <input
          type="password"
          value={passwordConfirmation}
          onChange={(event) => setPasswordConfirmation(event.target.value)}
        />
      </label>

      <button type="submit">アカウント作成</button>

      <p>すでにアカウントをお持ちの方は</p>
      <button type="button" onClick={() => navigate(routePaths.login.to())}>
        ログイン
      </button>
    </form>
  );
};

export default SignupPage;
