const actionButtonClassName =
  "inline-flex h-8 w-5 items-center justify-center rounded-md border border-black bg-white cursor-pointer hover:bg-gray-100";
const actionButtonDisabledStateClassName =
  "disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:opacity-50 disabled:hover:bg-gray-100";
const actionButtonWithDisabledClassName = `${actionButtonClassName} ${actionButtonDisabledStateClassName}`;
const iconClassName = "h-4 w-4";

export const ViewerIconButton = ({
  label,
  icon: Icon,
  className = "",
  disabled = false,
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
  </button>
);
