import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { login } from "../api/clients/mutationClient";
import { routePaths } from "../appConfig";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const { mutate: loginHandler } = useMutation({
    mutationFn: () => login({ username, password }),
    onSuccess: () => {
      navigate(routePaths.docs.to());
    },
    onError: () => {
      toast.error("ログインに失敗しました", {
        position: "top-center",
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

      <button onClick={() => loginHandler()}>ログイン</button>
    </div>
  );
};

export default LoginPage;
