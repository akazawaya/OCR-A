import { useState } from "react";
// Edit,Save,Cancelのロジック用まとめのhook

export const useViewerEditState = ({ commitDraftById }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftById, setDraftById] = useState({}); // id,文字列の辞書 なので初期値は空オブジェクト{}にしておくのが安全 []は配列で、これは連番に向いている

  // Table側でのonChangeに合わせてこれを呼ぶ
  const setDraftContent = (wordId, nextContent) => {
    //setFooは変数だけではなく、関数型更新　例：prev => 返り値：更新後 も受け取れる
    setDraftById((prev) => ({ ...prev, [wordId]: nextContent })); // ここでの[]は配列ではなく、オブジェクトリテラル{...}の用法の一部　[変数]をプロパティ名,キーにできる　こうしないと変数とならない
  };

  const startEdit = () => {
    setIsEditing(true);
  };

  const saveEdit = () => {
    commitDraftById(draftById);
    setIsEditing(false);
    setDraftById({}); // 保存後はドラフトを空にするのが安全
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setDraftById({});
  };

  return {
    isEditing,
    draftById,
    setDraftContent,
    startEdit,
    saveEdit,
    cancelEdit,
  };
};
