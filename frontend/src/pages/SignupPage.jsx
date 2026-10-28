import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { createUser } from "../api/clients/mutationClient";
import { routePaths } from "../appConfig";
import AppLogo from "../components/AppLogo";
import Button from "../components/ui/Button";
import TextInput from "../components/ui/TextInput";
import { formClassNames, pageClassNames } from "../components/ui/classNames";
import { toastStyles } from "../components/ui/toastStyles";
import { getResponseErrorMessage } from "../logic/error/getResponseErrorMessage";

const SignupPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const navigate = useNavigate();

  const { mutate: createUserMutation } = useMutation({
    mutationFn: () =>
      createUser({
        type: "registered",
        email,
        password,
      }),
    onSuccess: () => {
      navigate(routePaths.docs.to());
    },
    onError: (error) => {
      toast.error(
        getResponseErrorMessage(error.data, "アカウント作成に失敗しました"),
        toastStyles.error,
      );
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();

    if (password !== passwordConfirmation) {
      toast.error("パスワードが一致しません", toastStyles.error);
      return;
    }

    createUserMutation();
  };

  return (
    <div className={pageClassNames.panel}>
      <AppLogo />
      <form className={formClassNames.inputPanel} onSubmit={handleSubmit}>
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

        <label className={formClassNames.fieldLabel}>
          パスワード確認
          <TextInput
            type="password"
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
          />
        </label>

        <p className="w-full text-left text-sm text-gray-600">
          パスワードは8文字以上で入力してください。
        </p>

        <Button type="submit">アカウント作成</Button>
      </form>
      <div className="flex flex-col items-center">
        <p>すでにアカウントをお持ちの方は</p>
        <Button
          color="gray"
          type="button"
          onClick={() => navigate(routePaths.login.to())}
        >
          ログイン
        </Button>
      </div>
    </div>
  );
};

export default SignupPage;
