import { useEffect, useRef, useState } from "react";

import { useScroll } from "../../logic/layout/useScroll";

const ContentEditInput = ({
  content,
  className,
  onChangeContentDraft,
} = {}) => {
  const [editingContent, setEditingContent] = useState(content);

  useEffect(() => {
    setEditingContent(content);
  }, [content]);

  const finalizeEdit = () => {
    onChangeContentDraft(editingContent, content);
  };

  return (
    <input
      className={className}
      value={editingContent}
      onBlur={finalizeEdit}
      onChange={(e) => setEditingContent(e.target.value)}
      onKeyDown={(e) => {
        if (e.isComposing) return;
        if (e.key !== "Enter") return;
        e.preventDefault();
        finalizeEdit();
      }}
    />
  );
};

const ViewerTable = ({
  data: {
    columns = [],
    rows = [],
    page,
    hoveredId,
    selectedId,
    selectedBy,
    isEditing,
  } = {},
  events: {
    onClickColumn,
    onHover,
    onHoverClear,
    onSelect,
    onChangeContentDraft,
    onClickDeleteButton,
  } = {},
}) => {
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
          return (
            <tr
              key={r.id}
              className={`scroll-mt-30 ${
                isSelected
                  ? "bg-red-500/30"
                  : isHover
                    ? "bg-red-500/20"
                    : "bg-transparent"
              }`}
              data-page={r.page__page_number}
              data-word={r.id}
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
                    削除
                  </button>
                </td>
              )}

              {columns.map((c) => (
                <td key={c.key}>
                  {!isEditing || c.key !== "content" ? (
                    r[c.key]
                  ) : (
                    <ContentEditInput
                      className=""
                      content={r[c.key]}
                      onChangeContentDraft={(nextContent, prevContent) =>
                        onChangeContentDraft(r.id, nextContent, prevContent)
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
};

export default ViewerTable;
