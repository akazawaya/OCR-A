import { useState } from "react";
// Edit,Save,Cancelのロジック用まとめのhook

export const useViewerEditState = ({ patchWordContentById }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [contentDraftById, setContentDraftById] = useState({});

  // Table側でのonChangeに合わせてこれを呼ぶ
  // 外部からchangeのみを実行可能なようにsetのラッパーのみを返す
  const changeContentDraftById = (wordId, nextContent) => {
    setContentDraftById((prev) => ({ ...prev, [wordId]: nextContent })); // ここでの[]は配列ではなく、オブジェクトリテラル{...}の用法の一部　[変数]をプロパティ名,キーにできる　こうしないと変数とならない
  };

  const startEdit = () => {
    setIsEditing(true);
  };

  const saveEdit = () => {
    patchWordContentById(contentDraftById);
    setIsEditing(false);
    setContentDraftById({});
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setContentDraftById({});
  };

  return {
    isEditing,
    contentDraftById,
    changeContentDraftById,
    startEdit,
    saveEdit,
    cancelEdit,
  };
};
