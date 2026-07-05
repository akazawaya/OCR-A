import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { login } from "../api/clients/mutationClient";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const { mutate: loginHandler } = useMutation({
    mutationFn: () => login({ username, password }),
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
