import { useMemo } from "react";

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

export default function WordOverlay({
  data: { pageId, clientSizePx, imageSizePx } = {},
  state = {},
  events = {},
}) {
  const {
    words,
    hoveredWordId,
    selectedWordId,
    isEditing,
    pendingDeleteIdSet = new Set(),
    draftRect,
  } = state;

  const {
    onHoverWord,
    onHoverClearWord,
    onSelectWord,
    onAddPendingPostByBbox,
    startDrag,
    moveDrag,
    endDrag,
    cancelDrag,
  } = events;

  const imageW = imageSizePx.w;
  const imageH = imageSizePx.h;

  const wordsOnPage = words.filter((w) => Number(w.page) === Number(pageId));
  const pendingPostsOnPage = useMemo(() => {
    return wordsOnPage.filter((w) => w.isPendingPost);
  }, [wordsOnPage]);

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
      words: wordsOnPage,
    });
  }, [clientSizePx, imageW, imageH, wordsOnPage]);

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
