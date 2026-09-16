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
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-md bg-gray-200 px-2 py-1"
      role="toolbar"
    >
      <div className="flex items-center gap-1">
        {selectionButtons.map(({ mode, label, icon }) => (
          <ViewerIconButton
            key={mode}
            aria-pressed={selectionMode === mode}
            icon={icon}
            label={label}
            shouldShowLabel
            onClick={() => setSelectionMode(mode)}
          />
        ))}
      </div>

      <div className="flex items-center gap-1">
        {actionButtons.map(({ label, icon, disabled, onClick }) => (
          <ViewerIconButton
            key={label}
            disabled={isOcring || disabled}
            icon={icon}
            label={label}
            shouldShowLabel
            onClick={onClick}
          />
        ))}
      </div>
    </div>
  );
};
