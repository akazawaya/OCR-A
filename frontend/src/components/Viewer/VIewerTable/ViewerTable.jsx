import { useEffect, useRef } from "react";

// onRowClickはpageの時のnavigation用と、viewerの時のscroll用がある　
// ここではオプショナルチェイニング(.?)で両方を実行するようにして、呼び出し側からは重複しないようにする
export default function ViewerTable({
  columns = [],
  rows = [],
  loading,
  onColumnClick,
  viewerPageState = {},
  viewerWordState = {},
                          }) {

  const rootRef = useRef(null);
  const { values: { page } = {} } = viewerPageState;
  const {
    values: { hoveredWordId, selectedWordId, selectedBy } = {},
    events: { onRowMouseEnter, onRowMouseLeave, onRowClick } = {},
  } = viewerWordState;

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
            <th key={c.key} onClick={() => onColumnClick(c.key)}>
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
            onMouseEnter={() => onRowMouseEnter(row.id)}
            onMouseLeave={() => onRowMouseLeave()}
            onClick={() => onRowClick(row.id, "table")}
            style={{
              background: isSelected ? "rgba(255,0,0,0.12)" : isHover ? "rgba(255,0,0,0.06)" : "transparent", 
            }}>
            {columns.map(c => (
            	<td key={c.key}>{row[c.key]}</td>
          	))}
          </tr>
        );
      })}
      </tbody>
    </table>  
  );
}
// &&は||の逆で、左オペラント自身がTrueの時に右辺を返す
// <td key="__">はただの識別キーに過ぎない
// idは同じ親の直下に並ぶ兄弟内でユニークであればいいので、
// DeleteButtonのidは変数でなくて良い

// stopPropagation は伝搬を止めるという意味で、この場合　e.type → "click"を対象とし、
// tdのさらに親のtrにclickが伝搬されなくなる
