import { useEffect, useRef, useState } from "react";

import { buildRangeSelectionIds } from "../../logic/layout/useSelection";
import { useScroll } from "../../logic/layout/useScroll";
import { SortIcon } from "../ui/SortIcon";

const ContentEditInput = ({
  data: { wordId, content, inputSize } = {},
  actions: { changeContentDraftById } = {},
} = {}) => {
  const [editingContent, setEditingContent] = useState(content);

  useEffect(() => {
    setEditingContent(content);
  }, [content]);

  const finalizeEdit = () => {
    changeContentDraftById(wordId, editingContent, content);
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
    shiftSelectionStartId,
    scrollTargetId,
    isEditMode,
    wordSort,
  } = {},
  actions: {
    changeContentDraftById,
    toggleWordSort,
    hover,
    clearHovered,
    replaceSelection,
    toggleSelection,
    replaceSelectionRange,
    addSelectionRange,
  } = {},
}) => {
  const ordering = wordSort
    ? `${wordSort.order === "desc" ? "-" : ""}${wordSort.key}`
    : "";

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
    <table ref={rootRef} className="min-w-full">
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              className="cursor-pointer border border-gray-400 px-1 text-left hover:bg-gray-200"
              onClick={() => toggleWordSort(column.key)}
            >
              <span className="flex items-center justify-between gap-1 whitespace-nowrap">
                {column.label}
                <SortIcon columnKey={column.key} ordering={ordering} />
              </span>
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
                  const ids = buildRangeSelectionIds({
                    orderedIds: rows.map((row) => row.id),
                    startId: shiftSelectionStartId,
                    endId: r.id,
                  });
                  if (withCtrlOrMeta) {
                    addSelectionRange(ids);
                  } else {
                    replaceSelectionRange(ids);
                  }
                  return;
                }
                if (withCtrlOrMeta) {
                  toggleSelection(r.id, "table");
                  return;
                }
                replaceSelection(r.id, "table");
              }}
              onMouseEnter={() => hover(r.id)}
              onMouseLeave={clearHovered}
            >
              {columns.map((c) => (
                <td key={c.key} className="px-1">
                  {isEditMode && c.key === "content" ? (
                    <ContentEditInput
                      actions={{ changeContentDraftById }}
                      data={{
                        wordId: r.id,
                        content: r[c.key],
                        inputSize: maxContentLength,
                      }}
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
