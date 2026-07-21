import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  changeCurrentUserPassword,
  deleteCurrentUser,
} from "../api/clients/mutationClient";
import { routePaths } from "../appConfig";
import Button from "../components/ui/Button";
import TextInput from "../components/ui/TextInput";
import { toastStyles } from "../components/ui/toastStyles";

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
      onError: () => {
        toast.error("パスワードの変更に失敗しました", toastStyles.error);
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
      <form
        className="flex flex-col items-center gap-2 bg-white"
        onSubmit={handleSubmit}
      >
        <div>パスワードを変更</div>
        <label>
          現在のパスワード
          <TextInput
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </label>

        <label>
          新しいパスワード
          <TextInput
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </label>

        <label>
          新しいパスワード（確認）
          <TextInput
            type="password"
            value={newPasswordConfirmation}
            onChange={(event) => setNewPasswordConfirmation(event.target.value)}
          />
        </label>

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
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(90vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-2xl outline-none">
            <AlertDialog.Title className="text-lg font-semibold text-gray-900">
              アカウントを削除しますか？
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-3 text-sm leading-6 text-gray-600">
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
                {isDeletingUser ? "削除中..." : "削除する"}
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
};

export default SettingPage;
