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

const selectionModeLabelClassName =
  "inline-flex h-8 w-5 cursor-pointer items-center justify-center rounded-md border border-black bg-white hover:bg-gray-100 has-checked:bg-gray-700 has-checked:text-white has-checked:hover:bg-gray-700";
const selectionModeIconClassName = "h-4 w-4";

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
        {selectionButtons.map(({ mode, label, icon: Icon }) => (
          <label
            key={mode}
            className={selectionModeLabelClassName}
            title={label}
          >
            <input
              aria-label={label}
              checked={selectionMode === mode}
              className="sr-only"
              name="viewer-selection-mode"
              type="radio"
              onChange={() => onSelectionMode(mode)}
            />
            <Icon className={selectionModeIconClassName} />
          </label>
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
