import { useEffect, useRef, useState } from "react";
import { ScanLine, ScanText, Trash2 } from "lucide-react";

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
const ViewerTable = ({
  data: {
    columns = [],
    rows = [],
    page,
    hoveredId,
    selectedId,
    selectedBy,
    isEditMode,
  } = {},
  events: {
    onHover,
    onHoverClear,
    onSelect,
    onChangeContentDraft,
    onClickDeleteButton,
    onClickOcrRewriteButton,
    onClickOcrReplaceButton,
  } = {},
}) => {
  // edit中のinputの幅は事前に固定値を取る
  const maxContentLength = Math.max(
    20,
    ...rows.flatMap((r) => columns.map((c) => String(r[c.key]).length)),
  );

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
      <tbody>
        {rows.map((r) => {
          const isSelected = r.id === selectedId;
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
              onClick={() => onSelect(r.id, "table")}
              onMouseEnter={() => onHover(r.id)}
              onMouseLeave={onHoverClear}
            >
              {isEditMode && (
                <td className="sticky left-0 z-2">
                  <div className="flex items-center">
                    <button
                      aria-label="削除"
                      className="cursor-pointer border border-gray-400 bg-red-100 text-black hover:bg-red-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClickDeleteButton(r.id);
                      }}
                    >
                      <Trash2 className="h-4" />
                    </button>
                    <button
                      aria-label="OCR書換"
                      className="cursor-pointer border border-gray-400 bg-green-100 text-black hover:bg-green-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClickOcrRewriteButton(r);
                      }}
                    >
                      <ScanLine className="h-4" />
                    </button>
                    <button
                      aria-label="OCR置換"
                      className="cursor-pointer border border-gray-400 bg-blue-100 text-black hover:bg-blue-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClickOcrReplaceButton(r);
                      }}
                    >
                      <ScanText className="h-4" />
                    </button>
                  </div>
                </td>
              )}

              {columns.map((c) => (
                <td key={c.key} className="px-1">
                  {!isEditMode ? (
                    <span className="inline-block min-w-max">{r[c.key]}</span>
                  ) : (
                    <ContentEditInput
                      content={r[c.key]}
                      inputSize={maxContentLength}
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
