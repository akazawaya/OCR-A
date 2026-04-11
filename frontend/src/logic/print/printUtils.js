export const selectPrintTargetPage = (pages = [], currentPage) => {
  if (!Array.isArray(pages) || pages.length === 0) return undefined;
  const pageNum = Number(currentPage);
  if (!Number.isFinite(pageNum)) return pages[0];
  return pages.find((p) => Number(p.page_number) === pageNum) ?? pages[0];
};

export const buildPrintPageStyle = (printTargetPage) => {
  if (!printTargetPage) return null;
  const width = Number(printTargetPage.width_px);
  const height = Number(printTargetPage.height_px);
  return `
    @page {
      size: ${width}px ${height}px;
      margin: 0;
    }
  `;
};
