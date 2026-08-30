import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { createUser, login } from "../api/clients/mutationClient";
import { routePaths } from "../appConfig";
import AuthLogo from "../components/Auth/AuthLogo";
import Button from "../components/ui/Button";
import TextInput from "../components/ui/TextInput";
import { authClassNames, formClassNames } from "../components/ui/classNames";
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
    <div className={authClassNames.panel}>
      <AuthLogo />
      <form
        className={formClassNames.inputPanel}
        onSubmit={(e) => {
          e.preventDefault();
          loginMutation();
        }}
      >
        <label className={formClassNames.fieldLabel}>
          メールアドレス
          <TextInput
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className={formClassNames.fieldLabel}>
          パスワード
          <TextInput
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <Button>ログイン</Button>
      </form>
      <p>アカウントをお持ちでない方は</p>
      <div className="flex items-center gap-2">
        <Button onClick={() => navigate(routePaths.signup.to())}>
          新規登録
        </Button>
        <Button color="gray" onClick={() => createUserMutation()}>
          ゲストユーザーでログイン
        </Button>
      </div>
    </div>
  );
};

export default LoginPage;
