import { useEffect, useRef, useState } from "react";

import { getIdsBetween } from "../../logic/layout/useSelection";
import { useScroll } from "../../logic/layout/useScroll";

const ContentEditInput = ({
  content,
  inputSize,
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
      className="border-0 outline-none"
      size={inputSize}
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

const formatCellValue = (row, column) => {
  const value = row[column.key];
  return column.format ? column.format(value) : value;
};

const ViewerTable = ({
  data: {
    columns = [],
    rows = [],
    page,
    hoveredId,
    selectedIds,
    selectedBy,
    anchorId,
    scrollTargetId,
    isEditMode,
  } = {},
  events: {
    onChangeContentDraft,
    onHover,
    onHoverClear,
    onClickRow,
    onClickRowWithCtrlOrMeta,
    onClickRowWithShift,
    onClickRowWithShiftAndCtrlOrMeta,
  } = {},
}) => {
  // edit中のinputの幅は事前に固定値を取る
  const maxContentLength = Math.max(
    20,
    ...rows.map((row) => String(row.content ?? "").length),
  );

  const rootRef = useRef(null);
  // page変更に追随してスクロールする
  useScroll({ rootRef, targetAttrName: "data-page", targetAttrValue: page });
  // viewerTable起点のwordの選択時、viewerImage側を追随スクロールする
  const shouldScroll = selectedBy === "image";
  useScroll({
    rootRef,
    targetAttrName: "data-word",
    targetAttrValue: scrollTargetId,
    shouldScroll,
  });

  return (
    <table ref={rootRef}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              className="border border-gray-400 px-1 text-left"
            >
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const isSelected = selectedIds.has(r.id);
          const isHover = r.id === hoveredId;
          return (
            <tr
              key={r.id}
              className={`cursor-pointer scroll-mt-30 border border-gray-400 ${
                isSelected
                  ? "bg-red-500/30"
                  : isHover
                    ? "bg-red-500/20"
                    : "bg-transparent"
              }`}
              data-page={r.page__page_number}
              data-word={r.id}
              onClick={(event) => {
                const withCtrlOrMeta = event.ctrlKey || event.metaKey;
                if (event.shiftKey) {
                  const ids = getIdsBetween(
                    rows.map((row) => row.id),
                    anchorId,
                    r.id,
                  );
                  if (withCtrlOrMeta) {
                    onClickRowWithShiftAndCtrlOrMeta(ids);
                  } else {
                    onClickRowWithShift(ids);
                  }
                  return;
                }
                if (withCtrlOrMeta) {
                  onClickRowWithCtrlOrMeta(r.id, "table");
                  return;
                }
                onClickRow(r.id, "table");
              }}
              onMouseEnter={() => onHover(r.id)}
              onMouseLeave={onHoverClear}
            >
              {columns.map((c) => (
                <td key={c.key} className="px-1">
                  {isEditMode && c.key === "content" ? (
                    <ContentEditInput
                      content={r[c.key]}
                      inputSize={maxContentLength}
                      onChangeContentDraft={(nextContent, prevContent) =>
                        onChangeContentDraft(r.id, nextContent, prevContent)
                      }
                    />
                  ) : (
                    <span className="inline-block min-w-max">
                      {formatCellValue(r, c)}
                    </span>
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
