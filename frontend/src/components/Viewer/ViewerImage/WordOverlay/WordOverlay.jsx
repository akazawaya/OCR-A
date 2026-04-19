import { useMemo } from "react";

import { buildWordOverlayLayout } from "../../../../logic/layout/buildWordOverlayLayout";
import {
  buildCancelDragFromPointerEvent,
  buildMoveDragFromPointerEvent,
  buildStartDragFromPointerEvent,
} from "../../../../logic/drag/wordOverlayDragBindings";
import { buildEndDragAndAddPendingPostByBbox } from "../../../../logic/drag/endDragAndAddPendingPostByBbox";
import {
  bboxToPolygonPoints,
  rectToBbox,
} from "../../../../logic/transforms/bboxTransforms";

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

  const draftBbox = useMemo(() => {
    if (!draftRect) return null;
    return rectToBbox(draftRect);
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
        onPointerCancel={isEditing ? onPointerCancel : undefined}
        onPointerDown={isEditing ? onPointerDown : undefined}
        onPointerMove={isEditing ? onPointerMove : undefined}
        onPointerUp={isEditing ? onPointerUp : undefined}
        viewBox={`0 0 ${imageW ?? 0} ${imageH ?? 0}`}
      >
        {isEditing && draftBbox && (
          <polygon
            className="pointer-events-none fill-green-500/15 stroke-green-500 stroke-4"
            points={bboxToPolygonPoints(draftBbox)}
          />
        )}
        {pendingPostsOnPage.map((p) => (
          <polygon
            className="fill-green-500/15 stroke-green-500 stroke-4"
            points={bboxToPolygonPoints(p.bbox)}
          />
        ))}

        {wordLayout.map((w) => {
          const isSelected = w.id === selectedWordId;
          const isHover = w.id === hoveredWordId;
          const isPendingDelete = pendingDeleteIdSet.has(w.id);
          return (
            <polygon
              className={`stroke-red-500 stroke-4 ${
                isSelected
                  ? "fill-red-500/30"
                  : isHover
                    ? "fill-red-500/20"
                    : isPendingDelete
                      ? "fill-gray-400/30"
                      : "fill-transparent"
              }`}
              data-word={w.id}
              key={w.id}
              points={w.polygon.points}
            />
          );
        })}
      </svg>

      {wordLayout.map((w) => {
        const isPendingDelete = pendingDeleteIdSet.has(w.id);
        return (
          <span
            className={`absolute leading-none whitespace-nowrap text-transparent ${
              w.span.mode === "vertical"
                ? "[text-orientation:upright] [writing-mode:vertical-rl]"
                : ""
            } ${isPendingDelete ? "line-through" : ""}`}
            data-word={w.id}
            key={w.id}
            onClick={() => onSelectWord(w.id, "image")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectWord(w.id, "image");
              } // 現状意味がないので強化検討対象
            }}
            onMouseEnter={() => onHoverWord(w.id)}
            onMouseLeave={onHoverClearWord}
            role="button"
            style={{
              ...w.span.style,
              fontSize: `${w.span.fontPx}px`,
            }}
            tabIndex={0}
          >
            {w.span.text}
          </span>
        );
      })}
    </div>
  );
}
