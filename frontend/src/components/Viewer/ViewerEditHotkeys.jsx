import { useEffect } from "react";

export const ViewerEditHotkeys = ({
  data: { viewerRootRef } = {},
  actions: { undo, redo } = {},
}) => {
  useEffect(() => {
    const onWindowKeyDown = (e) => {
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
        undo();
        return;
      }

      if ((isMod && e.shiftKey && key === "z") || (e.ctrlKey && key === "y")) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", onWindowKeyDown);
    return () => window.removeEventListener("keydown", onWindowKeyDown);
  }, [undo, redo, viewerRootRef]);

  return null;
};
