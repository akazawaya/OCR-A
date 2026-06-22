import { useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";

export const usePrint = ({
  contentRef,
  pages = [],
  currentPage,
  documentTitle,
} = {}) => {
  const printPromiseResolveRef = useRef(null);
  const [isPrintMode, setIsPrintMode] = useState(false);

  useEffect(() => {
    if (isPrintMode && printPromiseResolveRef.current) {
      printPromiseResolveRef.current();
    }
  }, [isPrintMode]);

  const printTargetPage = useMemo(
    () => pages.find((p) => Number(p.page_number) === Number(currentPage)),
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
