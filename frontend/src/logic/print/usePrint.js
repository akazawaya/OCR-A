import { useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";

export const usePrint = ({
  contentRef,
  pages = [],
  currentPage,
  documentTitle = "viewer-export",
} = {}) => {
  const printPromiseResolveRef = useRef(null);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [printCycle, setPrintCycle] = useState(0);

  useEffect(() => {
    if (printCycle > 0 && printPromiseResolveRef.current) {
      printPromiseResolveRef.current();
    }
  }, [printCycle]);

  const printTargetPage = useMemo(
    () =>
      pages.find((p) => Number(p.page_number) === Number(currentPage)) ??
      pages[0],
    [pages, currentPage],
  );

  const printPageStyle = useMemo(() => {
    if (!printTargetPage) return null;
    const width = Number(printTargetPage.width_px);
    const height = Number(printTargetPage.height_px);
    return `
    @page {
      size: ${width}px ${height}px;
      margin: 0;
    }
  `;
  }, [printTargetPage]);

  const openPrintDialog = useReactToPrint({
    contentRef,
    documentTitle,
    pageStyle: printPageStyle,
    onBeforePrint: () =>
      new Promise((resolve) => {
        printPromiseResolveRef.current = resolve;
        setIsPrintMode(true);
        setPrintCycle((cycle) => cycle + 1);
      }),
    onAfterPrint: () => {
      printPromiseResolveRef.current = null;
      setIsPrintMode(false);
    },
    onPrintError: () => {
      printPromiseResolveRef.current = null;
      setIsPrintMode(false);
    },
  });

  return { isPrintMode, openPrintDialog };
};
