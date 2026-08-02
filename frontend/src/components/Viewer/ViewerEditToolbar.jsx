import {
  MousePointer2,
  ScanLine,
  ScanText,
  SquareDashed,
  SquareDashedMousePointer,
  Trash2,
} from "lucide-react";

import { ViewerIconButton } from "./ViewerIconButton";

const selectionButtons = [
  {
    mode: "click",
    label: "クリック選択",
    icon: MousePointer2,
  },
  {
    mode: "drag-select",
    label: "ドラッグ選択",
    icon: SquareDashedMousePointer,
  },
  {
    mode: "drag-add-bbox",
    label: "ドラッグで枠追加",
    icon: SquareDashed,
  },
];

const selectionModeLabelClassName =
  "inline-flex h-8 w-5 cursor-pointer items-center justify-center rounded-md border border-black bg-white hover:bg-gray-100 has-checked:bg-gray-700 has-checked:text-white has-checked:hover:bg-gray-700";
const selectionModeIconClassName = "h-4 w-4";

export const ViewerEditToolbar = ({
  data: { selectedWords = [], selectionMode = "click", isOcring = false } = {},
  actions: {
    setSelectionMode,
    deleteSelectedWords,
    rewritePreviewWordContentByOcr,
    replacePreviewWordByOcr,
  } = {},
} = {}) => {
  const selectedWord = selectedWords[0];
  const hasSelection = selectedWords.length > 0;
  const hasSingleSelection = selectedWords.length === 1;
  const actionButtons = [
    {
      label: "削除",
      icon: Trash2,
      disabled: !hasSelection,
      onClick: () => deleteSelectedWords(selectedWords.map((word) => word.id)),
    },
    {
      label: "OCR書換",
      icon: ScanLine,
      disabled: !hasSingleSelection,
      onClick: () => rewritePreviewWordContentByOcr(selectedWord),
    },
    {
      label: "OCR置換",
      icon: ScanText,
      disabled: !hasSingleSelection,
      onClick: () => replacePreviewWordByOcr(selectedWord),
    },
  ];

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
              onChange={() => setSelectionMode(mode)}
            />
            <Icon className={selectionModeIconClassName} />
          </label>
        ))}
      </div>

      <div className="flex items-center gap-1">
        {actionButtons.map(({ label, icon, disabled, onClick }) => (
          <ViewerIconButton
            key={label}
            disabled={isOcring || disabled}
            icon={icon}
            label={label}
            onClick={onClick}
          />
        ))}
      </div>
    </div>
  );
};
