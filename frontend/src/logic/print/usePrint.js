import { useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";

import { buildPrintPageStyle, selectPrintTargetPage } from "./printUtils";

export const usePrint = ({
  pages = [],
  currentPage,
  documentTitle = "viewer-export",
} = {}) => {
  const printRef = useRef(null);
  const printPromiseResolveRef = useRef(null);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [printCycle, setPrintCycle] = useState(0);

  useEffect(() => {
    if (printCycle > 0 && printPromiseResolveRef.current) {
      printPromiseResolveRef.current();
    }
  }, [printCycle]);

  const printTargetPage = useMemo(
    () => selectPrintTargetPage(pages, currentPage),
    [pages, currentPage],
  );

  const printPageStyle = useMemo(
    () => buildPrintPageStyle(printTargetPage),
    [printTargetPage],
  );

  const openPrintDialog = useReactToPrint({
    contentRef: printRef,
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

  return { printRef, isPrintMode, openPrintDialog };
};
