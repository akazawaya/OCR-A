import { useRef } from "react";

import { useScroll } from "../../logic/layout/useScroll";

export default function ViewerTable({
  data: { columns = [], rows = [] } = {},
  events: { onClickColumn } = {},
  page,
  wordState = {},
  wordEvents = {},
  editState = {},
  editEvents = {},
}) {
  const rootRef = useRef(null);
  const { hoveredWordId, selectedWordId, selectedBy } = wordState;
  const { onHoverWord, onHoverClearWord, onSelectWord } = wordEvents;

  const {
    isEditing,
    contentDraftById = {},
    pendingDeleteIdSet = new Set(),
  } = editState;
  const { onChangeContentDraft, onClickDeleteButton } = editEvents;

  // page変更に追随してスクロールする
  useScroll({ rootRef, targetAttrName: "data-page", targetAttrValue: page });

  // viewerTable起点のwordの選択時、viewerImage側を追随スクロールする
  const shouldScroll = selectedBy === "image";
  useScroll({
    rootRef,
    targetAttrName: "data-word",
    targetAttrValue: selectedWordId,
    shouldScroll,
  });

  return (
    <table ref={rootRef}>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} onClick={() => onClickColumn(c.key)}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const isSelected = r.id === selectedWordId;
          const isHover = r.id === hoveredWordId;
          const isPendingDelete = pendingDeleteIdSet.has(r.id);
          return (
            <tr
              key={r.id}
              data-page={r.page__page_number}
              data-word={r.id}
              onMouseEnter={() => onHoverWord(r.id)}
              onMouseLeave={onHoverClearWord}
              onClick={() => onSelectWord(r.id, "table")}
              className={
                isSelected
                  ? "bg-red-500/30"
                  : isHover
                    ? "bg-red-500/20"
                    : isPendingDelete
                      ? "bg-gray-400/30"
                      : "bg-transparent"
              }
            >
              {isEditing && (
                <td>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClickDeleteButton(r.id);
                    }}
                  >
                    {isPendingDelete ? "削除取消" : "削除予約"}
                  </button>
                </td>
              )}

              {columns.map((c) => (
                <td key={c.key}>
                  {!isEditing || c.key !== "content" ? (
                    r[c.key]
                  ) : (
                    <input
                      className={isPendingDelete ? "line-through" : ""}
                      value={contentDraftById[r.id] ?? r[c.key]}
                      onChange={(e) =>
                        onChangeContentDraft(r.id, e.target.value)
                      }
                    />
                  )}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
