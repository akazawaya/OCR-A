import { useEffect, useRef } from "react";

export const usePointerDownOutside = ({
  enable = true, // isOpenなどの真偽値を渡すことで、開いている間だけ監視を有効にする
  onPointerDownOutside,
} = {}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!enable) return;

    const handlePointerDown = (event) => {
      const container = containerRef.current;
      if (!container || container.contains(event.target)) return;
      onPointerDownOutside(event);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [enable, onPointerDownOutside]);

  return containerRef;
};
