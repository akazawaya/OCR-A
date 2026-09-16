import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;

const AlertDialogOverlay = ({ className = "", ...props }) => {
  return (
    <AlertDialogPrimitive.Overlay
      className={`fixed inset-0 z-50 bg-black/40 ${className}`}
      {...props}
    />
  );
};

const AlertDialogContent = ({ className = "", ...props }) => {
  return (
    <AlertDialogPrimitive.Content
      className={`fixed top-1/2 left-1/2 z-50 w-[min(90vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-2xl outline-none ${className}`}
      {...props}
    />
  );
};

const AlertDialogTitle = ({ className = "", ...props }) => {
  return (
    <AlertDialogPrimitive.Title
      className={`text-lg font-semibold text-gray-900 ${className}`}
      {...props}
    />
  );
};

const AlertDialogDescription = ({ className = "", ...props }) => {
  return (
    <AlertDialogPrimitive.Description
      className={`mt-3 text-sm leading-6 text-gray-600 ${className}`}
      {...props}
    />
  );
};

const AlertDialogCancel = ({ className = "", ...props }) => {
  return (
    <AlertDialogPrimitive.Cancel
      className={`w-fit rounded-md bg-gray-200 px-2 py-1 transition-colors enabled:cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-400 ${className}`}
      {...props}
    />
  );
};

const AlertDialogAction = ({ className = "", ...props }) => {
  return (
    <AlertDialogPrimitive.Action
      className={`w-fit rounded-md bg-red-500 px-2 py-1 text-white transition-colors enabled:cursor-pointer enabled:hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-gray-400 ${className}`}
      {...props}
    />
  );
};

const AlertDialog = {
  Root: AlertDialogPrimitive.Root,
  Trigger: AlertDialogTrigger,
  Portal: AlertDialogPortal,
  Overlay: AlertDialogOverlay,
  Content: AlertDialogContent,
  Title: AlertDialogTitle,
  Description: AlertDialogDescription,
  Cancel: AlertDialogCancel,
  Action: AlertDialogAction,
};

export default AlertDialog;
