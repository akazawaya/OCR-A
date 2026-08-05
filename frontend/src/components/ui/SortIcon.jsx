import { ArrowDown, ArrowDownUp, ArrowUp } from "lucide-react";

export const SortIcon = ({ ordering, columnKey }) => {
  const className = "h-[1em] w-[1em]";

  if (ordering === columnKey) return <ArrowUp className={className} />;
  if (ordering === `-${columnKey}`) return <ArrowDown className={className} />;
  return <ArrowDownUp className={className} />;
};
