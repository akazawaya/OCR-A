import { useRef } from "react";

import { useViewerPageStateContext } from "../../contexts/viewer/ViewerPageStateContext";
import { useViewerWordStateContext } from "../../contexts/viewer/ViewerWordStateContext";
import { useViewerEditStateContext } from "../../contexts/viewer/ViewerEditStateContext";
import { useScroll } from "../../logic/layout/useScroll";

export default function ViewerTable({
  data: { columns = [], rows = [] } = {},
  events: { onClickColumn } = {},
}) {
  const rootRef = useRef(null);
  const viewerPageState = useViewerPageStateContext();
  const viewerWordState = useViewerWordStateContext();
  const viewerEditState = useViewerEditStateContext();
  const { data: { page } = {} } = viewerPageState;
  const {
    data: { hoveredWordId, selectedWordId, selectedBy } = {},
    events: { onHoverWord, onHoverClearWord, onSelectWord } = {},
  } = viewerWordState;

  const {
    data: { isEditing, draftById } = {},
    events: { onChangeDraftContent } = {},
  } = viewerEditState;

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
                    : "bg-transparent"
              }
            >
              {columns.map((c) => (
                <td key={c.key}>
                  {!isEditing || c.key !== "content" ? (
                    r[c.key]
                  ) : (
                    <input
                      value={draftById[r.id] ?? r[c.key]}
                      onChange={(e) =>
                        onChangeDraftContent(r.id, e.target.value)
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
