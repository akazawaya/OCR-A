import { useMemo } from "react";

import { buildWordOverlayLayout } from "../../../logic/layout/buildWordOverlayLayout";
import { buildRangeSelectionIds } from "../../../logic/layout/useSelection";
import {
  bboxToBounds,
  bboxToRect,
  rectToBbox,
} from "../../../logic/transforms/bboxTransforms";
import { useDragRectState } from "../../../logic/drag/useDragRectState";

// 暫定でここに置く　交差したものすべて対象とする
const bboxesIntersect = (bboxA, bboxB) => {
  const a = bboxToBounds(bboxA);
  const b = bboxToBounds(bboxB);

  return (
    a.xMin < b.xMax && a.xMax > b.xMin && a.yMin < b.yMax && a.yMax > b.yMin
  );
};

const WordOverlay = ({
  data: {
    pageId,
    clientSizePx,
    imageSizePx,
    rotate,
    words = [],
    hoveredWordId,
    selectedIds = new Set(),
    shiftSelectionStartId,
    isEditMode,
    isOcring,
    isPrintMode,
    selectionMode,
  } = {},
  actions: {
    hover,
    clearHovered,
    replaceSelection,
    toggleSelection,
    replaceSelectionRange,
    addSelectionRange,
    addPendingPostByBbox,
  } = {},
}) => {
  const wordsOnPage = words.filter((w) => Number(w.page) === Number(pageId));
  const isClickMode = selectionMode === "click";
  const isDragSelectMode = selectionMode === "drag-select";
  const isDragAddBboxMode = selectionMode === "drag-add-bbox";
  const canClickWord = !isEditMode || isClickMode;
  const canDrag =
    isEditMode && !isOcring && (isDragSelectMode || isDragAddBboxMode);

  const handleDragComplete = (pageId, bbox, direction) => {
    if (isDragSelectMode) {
      // useDragRectStateは無視して、交差したものすべてを選択対象とする
      const ids = wordsOnPage
        .filter((word) => bboxesIntersect(word.bbox, bbox))
        .map((word) => word.id);
      replaceSelectionRange(ids);
      return;
    }
    if (isDragAddBboxMode) {
      // useDragRectStateで新たなbboxを作らせる
      const pendingPostId = addPendingPostByBbox(pageId, bbox, direction);
      if (pendingPostId) replaceSelection(pendingPostId, "image");
    }
  };

  const {
    draftRect,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  } = useDragRectState({
    imageSizePx,
    rotate,
    pageId,
    onDragComplete: handleDragComplete,
  });
  const pendingPostsOnPage = useMemo(() => {
    return wordsOnPage.filter((w) => w.isPendingPost);
  }, [wordsOnPage]);

  const draftBbox = useMemo(() => {
    if (!draftRect) return null;
    return rectToBbox(draftRect);
  }, [draftRect]);

  const { wordLayout } = useMemo(() => {
    return buildWordOverlayLayout({
      clientSizePx,
      imageSizePx,
      words: wordsOnPage,
    });
  }, [clientSizePx, imageSizePx, wordsOnPage]);

  return (
    <div className="absolute inset-0">
      <svg
        aria-label="文字範囲選択エリア"
        viewBox={`0 0 ${imageSizePx.w} ${imageSizePx.h}`}
        onPointerCancel={canDrag ? onPointerCancel : undefined}
        onPointerDown={canDrag ? onPointerDown : undefined}
        onPointerMove={canDrag ? onPointerMove : undefined}
        onPointerUp={canDrag ? onPointerUp : undefined}
      >
        {isEditMode && draftBbox && (
          <rect
            className="pointer-events-none fill-green-500/15 stroke-green-500 stroke-4"
            {...bboxToRect(draftBbox)}
          />
        )}
        {pendingPostsOnPage.map((p) => (
          <rect
            key={p.id}
            className="fill-green-500/15 stroke-green-500 stroke-4"
            {...bboxToRect(p.bbox)}
          />
        ))}

        {wordLayout.map((w) => {
          const isSelected = selectedIds.has(w.id);
          const isHover = w.id === hoveredWordId;
          return (
            <rect
              key={w.id}
              className={`scroll-mt-30 ${
                isPrintMode
                  ? "fill-transparent"
                  : isSelected
                    ? " fill-red-500/30 stroke-red-500 stroke-4"
                    : isHover
                      ? "fill-red-500/20 stroke-red-500 stroke-4"
                      : "fill-transparent stroke-red-500 stroke-4"
              }`}
              data-scroll-target-word={w.id}
              {...w.rect}
              onMouseEnter={() => hover(w.id)}
              onMouseLeave={clearHovered}
            />
          );
        })}
      </svg>

      {wordLayout.map((w) => {
        const isHover = w.id === hoveredWordId;
        return (
          <button
            key={w.id}
            className={`absolute flex items-center justify-center leading-none ${
              canClickWord ? "" : "pointer-events-none"
            } ${
              w.span.mode === "vertical"
                ? "[text-orientation:upright] [writing-mode:vertical-rl]"
                : ""
            } ${isHover ? "text-white [text-shadow:0_0_2px_black,0_0_4px_black]" : "text-transparent"}`}
            data-scroll-target-word={w.id}
            style={{
              ...w.span.style,
              fontSize: `${w.span.fontPx}px`,
            }}
            onClick={
              canClickWord
                ? (event) => {
                    const withCtrlOrMeta = event.ctrlKey || event.metaKey;
                    if (event.shiftKey) {
                      const ids = buildRangeSelectionIds({
                        orderedIds: words.map((word) => word.id),
                        startId: shiftSelectionStartId,
                        endId: w.id,
                      });
                      if (withCtrlOrMeta) {
                        addSelectionRange(ids);
                      } else {
                        replaceSelectionRange(ids);
                      }
                      return;
                    }
                    if (withCtrlOrMeta) {
                      toggleSelection(w.id, "image");
                      return;
                    }
                    replaceSelection(w.id, "image");
                  }
                : undefined
            }
            onMouseEnter={() => hover(w.id)}
            onMouseLeave={clearHovered}
          >
            {w.span.text}
          </button>
        );
      })}
    </div>
  );
};

export default WordOverlay;
