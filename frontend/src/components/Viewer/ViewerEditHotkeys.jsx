import { useEffect } from "react";

import { useViewerEditStateContext } from "../../contexts/viewer/ViewerEditStateContext";

export const ViewerEditHotkeys = ({ viewerRootRef }) => {
  const viewerEditState = useViewerEditStateContext();
  const {
    data: { isEditing },
    events: { onKeyDownUndo, onKeyDownRedo },
  } = viewerEditState;

  useEffect(() => {
    const onWindowKeyDown = (e) => {
      if (!isEditing) return;
      if (e.isComposing) return;

      const active = document.activeElement;

      const isTypingTarget =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement ||
        active.isContentEditable;

      if (isTypingTarget) return;

      const key = e.key.toLowerCase();
      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && !e.shiftKey && key === "z") {
        e.preventDefault();
        onKeyDownUndo();
        return;
      }

      if ((isMod && e.shiftKey && key === "z") || (e.ctrlKey && key === "y")) {
        e.preventDefault();
        onKeyDownRedo();
      }
    };

    window.addEventListener("keydown", onWindowKeyDown);
    return () => window.removeEventListener("keydown", onWindowKeyDown);
  }, [isEditing, onKeyDownUndo, onKeyDownRedo, viewerRootRef]);

  return null;
};
