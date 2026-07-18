import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { createUser } from "../api/clients/mutationClient";
import { routePaths } from "../appConfig";
import Button from "../components/ui/Button";
import TextInput from "../components/ui/TextInput";
import { toastStyles } from "../components/ui/toastStyles";

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
      toast.error("アカウント作成に失敗しました", toastStyles.error);
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
    <div className="mx-auto mt-32 flex w-fit flex-col items-center rounded-md border border-gray-400 bg-white p-2">
      <form
        className="flex flex-col items-center gap-2 bg-white"
        onSubmit={handleSubmit}
      >
        <label>
          ユーザー名
          <TextInput
            value={username}
            onChange={(event) => setUsername(event.target.value)}
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

        <label>
          パスワード確認
          <TextInput
            type="password"
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
          />
        </label>

        <Button type="submit">アカウント作成</Button>
      </form>
      <div className="mt-8 flex flex-col items-center">
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
