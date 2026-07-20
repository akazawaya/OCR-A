import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { createUser, login } from "../api/clients/mutationClient";
import { routePaths } from "../appConfig";
import Button from "../components/ui/Button";
import TextInput from "../components/ui/TextInput";
import { toastStyles } from "../components/ui/toastStyles";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const { mutate: loginMutation } = useMutation({
    mutationFn: () => login({ email, password }),
    onSuccess: () => {
      navigate(routePaths.docs.to());
    },
    onError: () => {
      toast.error("ログインに失敗しました", toastStyles.error);
    },
  });

  const { mutate: createUserMutation } = useMutation({
    mutationFn: () => createUser(),
    onSuccess: () => {
      navigate(routePaths.docs.to());
    },
    onError: () => {
      toast.error("ログインに失敗しました", toastStyles.error);
    },
  });

  return (
    <div className="mx-auto mt-32 flex w-fit flex-col items-center gap-1 rounded-md border border-gray-400 bg-white p-2">
      <form
        className="flex flex-col items-center gap-2 bg-white"
        onSubmit={(e) => {
          e.preventDefault();
          loginMutation();
        }}
      >
        <label>
          メールアドレス
          <TextInput
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label>
          パスワード
          <TextInput
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <Button>ログイン</Button>
      </form>
      <Button color="gray" onClick={() => createUserMutation()}>
        ゲストユーザーでログイン
      </Button>

      <p>アカウントをお持ちでない方は</p>
      <Button onClick={() => navigate(routePaths.signup.to())}>新規登録</Button>
    </div>
  );
};

export default LoginPage;
