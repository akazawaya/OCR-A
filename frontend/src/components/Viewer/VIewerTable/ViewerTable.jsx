import { useEffect, useRef } from "react";
import { useViewerPageStateContext } from "../../../contexts/viewer/ViewerPageStateContext";
import { useViewerWordStateContext } from "../../../contexts/viewer/ViewerWordStateContext";
import { useViewerEditStateContext } from "../../../contexts/viewer/ViewerEditStateContext";
// onClickRowはpageの時のnavigation用と、viewerの時のscroll用がある　
// ここではオプショナルチェイニング(.?)で両方を実行するようにして、呼び出し側からは重複しないようにする
export default function ViewerTable({
  columns = [],
  rows = [],
  loading,
  onClickColumn,
                          }) {

  const rootRef = useRef(null);
  const viewerPageState = useViewerPageStateContext();
  const viewerWordState = useViewerWordStateContext();
  const viewerEditState = useViewerEditStateContext();
  const { values: { page } = {} } = viewerPageState;
  const {
    values: { hoveredWordId, selectedWordId, selectedBy } = {},
    events: { onHoverWord, onHoverClearWord, onSelectWord } = {},
  } = viewerWordState;

  const {
    values: { isEditing, draftById } = {},
    events: { onChangeDraftContent } = {},
  } = viewerEditState;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const element = root.querySelector(`[data-page="${page}"]`);
    if (!element) return;

    element.scrollIntoView({ behavior: "auto", block: "start" });
  }, [page]);

 
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (selectedBy !== "image") return;  

    const element = root.querySelector(`[data-word="${selectedWordId}"]`)
    if (!element) return;

    element.scrollIntoView({ behavior: "auto", block: "start" });
  }, [selectedBy, selectedWordId]);


  if (loading) return <div>Loading…</div>;
  return (
    <table ref={rootRef}>
      <thead>
        <tr>
          {columns.map(c => (
            <th key={c.key} onClick={() => onClickColumn(c.key)}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
      {rows.map(row => {
        const isSelected = row.id === selectedWordId;
        const isHover = row.id === hoveredWordId;
        return (
          <tr key={row.id} data-page={row.page__page_number} data-word={row.id} 
            onMouseEnter={() => onHoverWord?.(row.id)}
            onMouseLeave={() => onHoverClearWord?.()}
            onClick={() => onSelectWord?.(row.id, "table")}
            style={{
              background: isSelected ? "rgba(255,0,0,0.12)" : isHover ? "rgba(255,0,0,0.06)" : "transparent", 
            }}>
            {columns.map(c => (
            	<td key={c.key}>
                {!isEditing || c.key !== "content" ? (
                  row[c.key]
                ):(
                <input
                  value={draftById[row.id] ?? row[c.key]}
                  onChange={(e) => onChangeDraftContent(row.id, e.target.value)}
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

// ||はorなので、!isEditingとc.key !== "content"のどちらもFalseでないとinputにならない
// <td key="__">はただの識別キーに過ぎない
// idは同じ親の直下に並ぶ兄弟内でユニークであればいいので、
// DeleteButtonのidは変数でなくて良い

// stopPropagation は伝搬を止めるという意味で、この場合　e.type → "click"を対象とし、
// tdのさらに親のtrにclickが伝搬されなくなる
