import { useMemo } from "react";

import { useViewerWordStateContext } from "../../../../contexts/viewer/ViewerWordStateContext";
import { useViewerEditStateContext } from "../../../../contexts/viewer/ViewerEditStateContext";
import { useViewerDragRectStateContext } from "../../../../contexts/viewer/ViewerDragRectStateContext";
import { buildWordOverlayLayout } from "../../../../logic/layout/buildWordOverlayLayout";
import {
  buildCancelDragFromPointerEvent,
  buildMoveDragFromPointerEvent,
  buildStartDragFromPointerEvent,
} from "../../../../logic/drag/wordOverlayDragBindings";
import {
  buildBboxFromRect,
  buildEndDragAndAddPendingPostByBbox,
} from "../../../../logic/drag/endDragAndAddPendingPostByBbox";

export default function WordOverlay({ data: { pageId, clientSizePx } = {} }) {
  const viewerWordState = useViewerWordStateContext();
  const viewerEditState = useViewerEditStateContext();
  const viewerDragRectState = useViewerDragRectStateContext();
  const {
    data: { pageMetaById, wordsByPageId, hoveredWordId, selectedWordId } = {},
    events: { onHoverWord, onHoverClearWord, onSelectWord } = {},
  } = viewerWordState;
  const meta = pageMetaById.get(pageId);
  const words = wordsByPageId.get(pageId) ?? [];
  const imageW = meta?.w;
  const imageH = meta?.h;

  const {
    data: { isEditing, pendingDeleteIdSet } = {},
    events: { onAddPendingPostByBbox } = {},
  } = viewerEditState;

  const pendingPostsOnPage = useMemo(() => {
    return words.filter((w) => w.isPendingPost);
  }, [words]);

  const {
    data: { draftRect } = {},
    events: { startDrag, moveDrag, endDrag, cancelDrag } = {},
  } = viewerDragRectState;

  const buildPolygonPointsFromBbox = (polygon = []) =>
    polygon.map(([x, y]) => `${x},${y}`).join(" ");

  const draftBbox = useMemo(() => {
    if (!draftRect) return null;
    return buildBboxFromRect(draftRect);
  }, [draftRect]);

  const { wordLayout } = useMemo(() => {
    const imageSizePx =
      imageW == null || imageH == null ? null : { w: imageW, h: imageH };
    return buildWordOverlayLayout({
      clientSizePx,
      imageSizePx,
      words,
    });
  }, [clientSizePx, imageW, imageH, words]);

  const onPointerDown = buildStartDragFromPointerEvent({
    imageW,
    imageH,
    startDrag,
  });

  const onPointerMove = buildMoveDragFromPointerEvent({
    imageW,
    imageH,
    moveDrag,
  });

  const onPointerCancel = buildCancelDragFromPointerEvent({
    cancelDrag,
  });
  const onPointerUp = buildEndDragAndAddPendingPostByBbox({
    pageId,
    imageW,
    imageH,
    endDrag,
    addPendingPostByBbox: onAddPendingPostByBbox,
  });

  return (
    <div className="absolute inset-0">
      <svg
        viewBox={`0 0 ${imageW ?? 0} ${imageH ?? 0}`}
        onPointerDown={isEditing ? onPointerDown : undefined}
        onPointerMove={isEditing ? onPointerMove : undefined}
        onPointerUp={isEditing ? onPointerUp : undefined}
        onPointerCancel={isEditing ? onPointerCancel : undefined}
      >
        {isEditing && draftBbox && (
          <polygon
            points={buildPolygonPointsFromBbox(draftBbox)}
            className="pointer-events-none fill-green-500/15 stroke-green-500 stroke-4"
          />
        )}
        {pendingPostsOnPage.map((p) => (
          <polygon
            points={buildPolygonPointsFromBbox(p.bbox)}
            className="fill-green-500/15 stroke-green-500 stroke-4"
          />
        ))}

        {wordLayout.map((w) => {
          const isSelected = w.id === selectedWordId;
          const isHover = w.id === hoveredWordId;
          const isPendingDelete = pendingDeleteIdSet.has(w.id);
          return (
            <polygon
              key={w.id}
              data-word={w.id}
              points={w.polygon.points}
              className={`stroke-red-500 stroke-4 ${
                isSelected
                  ? "fill-red-500/30"
                  : isHover
                    ? "fill-red-500/20"
                    : isPendingDelete
                      ? "fill-gray-400/30"
                      : "fill-transparent"
              }`}
            />
          );
        })}
      </svg>

      {wordLayout.map((w) => {
        const isPendingDelete = pendingDeleteIdSet.has(w.id);
        return (
          <span
            key={w.id}
            data-word={w.id}
            onMouseEnter={() => onHoverWord(w.id)}
            onMouseLeave={onHoverClearWord}
            onClick={() => onSelectWord(w.id, "image")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectWord(w.id, "image");
              } // 現状意味がないので強化検討対象
            }}
            className={`absolute leading-none whitespace-nowrap text-transparent ${
              w.span.mode === "vertical"
                ? "[text-orientation:upright] [writing-mode:vertical-rl]"
                : ""
            } ${isPendingDelete ? "line-through" : ""}`}
            style={{
              ...w.span.style,
              fontSize: `${w.span.fontPx}px`,
            }}
          >
            {w.span.text}
          </span>
        );
      })}
    </div>
  );
}
