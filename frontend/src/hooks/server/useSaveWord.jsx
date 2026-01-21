import { useCallback } from "react";
import { fetchBackend } from "../../api/fetchBackend"

//　try/catchはProvider側で担う
export const useSaveWord = (collectionUrl) => {
  const patchDraftById = useCallback(async (draftById) => {
    const snapshot = { ...(draftById) ?? {} }; // データ一貫性のためスナップショットをとっておく
    const entries = Object.entries(snapshot);
    // Object.entriesは{key,value} を {[],[]}という配列の集合で返す。そのままfor文に使えて便利
    for (const [wordId, content] of entries){
      const patchUrl = `${collectionUrl}${wordId}/`;
      await fetchBackend(patchUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content }),
        throwOnError: true ,
      });
    }
  }, [collectionUrl]);
    return { patchDraftById };
};
