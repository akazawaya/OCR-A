import { useEffect, useRef } from "react";
import DeleteButton from "./DeleteButton/DeleteButton";

// onRowClickはpageの時のnavigation用と、viewerの時のscroll用がある　
// ここではオプショナルチェイニング(.?)で両方を実行するようにして、呼び出し側からは重複しないようにする
export default function Table({
  data,
  viewerPageState = {},
  viewerWordState = {},
  navigation = {}, 
  options:{onDeleteButtonClick} = {}, 
                          }) {

  const { columns = [], rows = [], loading } = data;
  const { page } = viewerPageState;
  const tableRef = useRef(null);
  const hoveredWordId = viewerWordState?.hoveredWordId ?? null;
  const selectedWordId = viewerWordState?.selectedWordId ?? null;

  useEffect(() => {
    const root = tableRef.current;
    if (!root) return;

    const element = root.querySelector(`[data-page="${page}"]`);
    // querySelectorはCSSセレクタを用いて合致するDOMを検索する機能

    if (!element) return;

    element.scrollIntoView({ behavior: "auto", block: "start" }); 
  }, [page, rows.length]);


  if (loading) return <div>Loading…</div>;
  return (
    <table ref={tableRef}>
      <thead>
        <tr>
          {columns.map(c => (
            <th key={c.key} onClick={() => navigation?.onColumnClick(c.key)}>
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
          <tr key={row.id} data-page={row.page__page_number}
            onMouseEnter={() => viewerWordState?.hoverWord?.(row.id)}
            onMouseLeave={() => viewerWordState?.unHoverWord?.()}
            onClick={() => {
              viewerWordState?.selectWord?.(row.id, "table");
              navigation?.onRowClick?.(row);
            }}
            style={{
              background: isSelected ? "rgba(255,0,0,0.12)" : isHover ? "rgba(255,0,0,0.06)" : "transparent", 
            }}>
            {columns.map(c => (
            	<td key={c.key}>{row[c.key]}</td>
          	))}
            {onDeleteButtonClick && (
              <td key="__delete" onClick={(e) => {e.stopPropagation()}}> 
                <DeleteButton onClick={() => onDeleteButtonClick?.(row)} />
              </td>
            )}
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