import { useRef } from "react";

import { useScroll } from "../../logic/layout/useScroll";

export default function ViewerTable({
  data: {
    columns = [],
    rows = [],
    page,
    hoveredId,
    selectedId,
    selectedBy,
    isEditing,
    contentDraftById = {},
    pendingDeleteIdSet = new Set(),
  } = {},
  events: {
    onClickColumn,
    onHover,
    onHoverClear,
    onSelect,
    onChangeContentDraft,
    onClickDeleteButton,
  } = {},
}) {
  const rootRef = useRef(null);

  // page変更に追随してスクロールする
  useScroll({ rootRef, targetAttrName: "data-page", targetAttrValue: page });

  // viewerTable起点のwordの選択時、viewerImage側を追随スクロールする
  const shouldScroll = selectedBy === "image";
  useScroll({
    rootRef,
    targetAttrName: "data-word",
    targetAttrValue: selectedId,
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
          const isSelected = r.id === selectedId;
          const isHover = r.id === hoveredId;
          const isPendingDelete = pendingDeleteIdSet.has(r.id);
          return (
            <tr
              className={
                isSelected
                  ? "bg-red-500/30"
                  : isHover
                    ? "bg-red-500/20"
                    : isPendingDelete
                      ? "bg-gray-400/30"
                      : "bg-transparent"
              }
              data-page={r.page__page_number}
              data-word={r.id}
              key={r.id}
              onClick={() => onSelect(r.id, "table")}
              onMouseEnter={() => onHover(r.id)}
              onMouseLeave={onHoverClear}
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
                      onChange={(e) =>
                        onChangeContentDraft(r.id, e.target.value)
                      }
                      value={contentDraftById[r.id] ?? r[c.key]}
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
