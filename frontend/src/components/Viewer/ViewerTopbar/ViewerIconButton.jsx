const actionButtonClassName =
  "inline-flex h-8 min-w-8 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-md border border-black bg-white px-1.5 hover:bg-gray-100 aria-pressed:bg-gray-700 aria-pressed:text-white aria-pressed:hover:bg-gray-700";
const actionButtonDisabledStateClassName =
  "disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:opacity-50 disabled:hover:bg-gray-100";
const actionButtonWithDisabledClassName = `${actionButtonClassName} ${actionButtonDisabledStateClassName}`;
const iconClassName = "h-4 w-4";

export const ViewerIconButton = ({
  label,
  icon: Icon,
  className = "",
  disabled = false,
  shouldShowLabel = false,
  onClick,
  ...buttonProps
}) => (
  <button
    aria-label={label}
    className={`${actionButtonWithDisabledClassName} ${className}`}
    disabled={disabled}
    title={label}
    type="button"
    {...buttonProps}
    onClick={onClick}
  >
    <Icon className={iconClassName} />
    {shouldShowLabel && <span className="hidden sm:inline">{label}</span>}
  </button>
);
