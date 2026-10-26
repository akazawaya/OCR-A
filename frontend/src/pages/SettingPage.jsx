import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  changeCurrentUserPassword,
  deleteCurrentUser,
} from "../api/clients/mutationClient";
import { routePaths } from "../appConfig";
import AlertDialog from "../components/ui/AlertDialog";
import Button from "../components/ui/Button";
import TextInput from "../components/ui/TextInput";
import { formClassNames } from "../components/ui/classNames";
import { toastStyles } from "../components/ui/toastStyles";
import { getResponseErrorMessage } from "../logic/error/getResponseErrorMessage";

const SettingPage = () => {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { mutate: changePasswordMutation, isPending: isChangingPassword } =
    useMutation({
      mutationFn: () =>
        changeCurrentUserPassword({
          currentPassword,
          newPassword,
        }),
      onSuccess: () => {
        setCurrentPassword("");
        setNewPassword("");
        setNewPasswordConfirmation("");
        toast.success("パスワードを変更しました");
      },
      onError: (error) => {
        toast.error(
          getResponseErrorMessage(error.data, "パスワードの変更に失敗しました"),
          toastStyles.error,
        );
      },
    });

  const { mutate: deleteUserMutation, isPending: isDeletingUser } = useMutation(
    {
      mutationFn: deleteCurrentUser,
      onSuccess: () => {
        navigate(routePaths.login.to(), { replace: true });
      },
      onError: () => {
        toast.error("アカウント削除に失敗しました", toastStyles.error);
      },
    },
  );

  const handleSubmit = (event) => {
    event.preventDefault();

    if (newPassword !== newPasswordConfirmation) {
      toast.error("新しいパスワードが一致しません", toastStyles.error);
      return;
    }

    changePasswordMutation();
  };

  return (
    <div className="flex flex-col items-center justify-center gap-1 border-2 p-2">
      <p>アカウント設定</p>
      <form className={formClassNames.inputPanel} onSubmit={handleSubmit}>
        <div>パスワードを変更</div>
        <label className={formClassNames.fieldLabel}>
          現在のパスワード
          <TextInput
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </label>

        <label className={formClassNames.fieldLabel}>
          新しいパスワード
          <TextInput
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </label>

        <label className={formClassNames.fieldLabel}>
          新しいパスワード（確認）
          <TextInput
            type="password"
            value={newPasswordConfirmation}
            onChange={(event) => setNewPasswordConfirmation(event.target.value)}
          />
        </label>

        <p className="w-full text-left text-sm text-gray-600">
          新しいパスワードは8文字以上で入力してください。
        </p>

        <Button disabled={isChangingPassword} type="submit">
          変更
        </Button>
      </form>

      <Button color="red" onClick={() => setIsDeleteDialogOpen(true)}>
        アカウントを削除
      </Button>

      <AlertDialog.Root
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay />
          <AlertDialog.Content>
            <AlertDialog.Title>
              本当に削除してよろしいですか？
            </AlertDialog.Title>
            <AlertDialog.Description>
              アカウントに紐づくデータはすべて削除されます。この操作は取り消せません。
            </AlertDialog.Description>
            <div className="mt-6 flex justify-end gap-2">
              <AlertDialog.Cancel disabled={isDeletingUser}>
                キャンセル
              </AlertDialog.Cancel>
              <AlertDialog.Action
                disabled={isDeletingUser}
                onClick={(event) => {
                  event.preventDefault();
                  deleteUserMutation();
                }}
              >
                {isDeletingUser ? "削除中..." : "削除"}
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
};

export default SettingPage;
