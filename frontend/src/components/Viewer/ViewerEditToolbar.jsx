import { useState } from "react";
import {
  MousePointer2,
  ScanLine,
  ScanText,
  SquareDashed,
  SquareDashedMousePointer,
  Trash2,
} from "lucide-react";

import { ViewerIconButton } from "./ViewerIconButton";

const SELECTION_MODE = {
  CLICK: "click",
  DRAG_SELECT: "drag-select",
  DRAG_ADD_BBOX: "drag-add-bbox",
};

const selectionButtons = [
  {
    mode: SELECTION_MODE.CLICK,
    label: "クリック選択",
    icon: MousePointer2,
  },
  {
    mode: SELECTION_MODE.DRAG_SELECT,
    label: "ドラッグ選択",
    icon: SquareDashedMousePointer,
  },
  {
    mode: SELECTION_MODE.DRAG_ADD_BBOX,
    label: "ドラッグで枠追加",
    icon: SquareDashed,
  },
];

const selectionModeButtonClassName =
  "aria-pressed:bg-gray-700 aria-pressed:text-white aria-pressed:hover:bg-gray-700";

const actionButtons = [
  { label: "削除", icon: Trash2 },
  { label: "OCR書換", icon: ScanLine },
  { label: "OCR置換", icon: ScanText },
];

export const ViewerEditToolbar = () => {
  const [selectionMode, setSelectionMode] = useState(SELECTION_MODE.CLICK);

  const onSelectionMode = (nextSelectionMode) => {
    setSelectionMode(nextSelectionMode);
  };

  return (
    <div
      aria-label="編集ツールバー"
      className="flex items-center justify-center gap-5 border-t bg-gray-200 px-2 py-1"
      role="toolbar"
    >
      <div className="flex items-center gap-1">
        {selectionButtons.map(({ mode, label, icon }) => (
          <ViewerIconButton
            key={mode}
            aria-pressed={selectionMode === mode}
            className={selectionModeButtonClassName}
            icon={icon}
            label={label}
            onClick={() => onSelectionMode(mode)}
          />
        ))}
      </div>

      <div className="flex items-center gap-1">
        {actionButtons.map(({ label, icon }) => (
          <ViewerIconButton key={label} icon={icon} label={label} disabled />
        ))}
      </div>
    </div>
  );
};
