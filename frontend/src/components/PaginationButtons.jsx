import Button from "./ui/Button";
// page_size(1ページに返す件数)はbackendのPageNumberPaginationの継承先を参照
const MAX_ITEMS = 7; // 省略せず表示できる総ページ数 これを超えたら…で省略表現を挟む
const EDGE_PAGE_COUNT = 5; // 現在ページが端付近にあるとき、その端から連続表示するページ数
const EDGE_THRESHOLD = EDGE_PAGE_COUNT - 1; // 端の連続表示から現在Page起点の表示に切り替えるページの境界

const makePageRange = (start, end) =>
  Array.from({ length: end - start + 1 }, (_, index) => start + index);

const buildPageItems = (currentPage, totalPages) => {
  if (totalPages <= MAX_ITEMS) {
    return makePageRange(1, totalPages);
  }

  if (currentPage <= EDGE_THRESHOLD) {
    return [...makePageRange(1, EDGE_PAGE_COUNT), "…", totalPages];
  }

  if (currentPage >= totalPages - EDGE_THRESHOLD + 1) {
    return [
      1,
      "…",
      ...makePageRange(totalPages - EDGE_PAGE_COUNT + 1, totalPages),
    ];
  }

  return [
    1,
    "…",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "…",
    totalPages,
  ];
};

const PaginationButtons = ({
  data: { currentPage, totalPages } = {},
  actions: { setPage } = {},
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center gap-1">
      {buildPageItems(currentPage, totalPages).map((item, index) => {
        if (typeof item !== "number") {
          // このtypeofは"…"を無視する用
          return <span key={`ellipsis-${index}`}>{item}</span>;
        }

        const isCurrentPage = item === currentPage;
        return (
          <Button
            key={item}
            color="gray"
            disabled={isCurrentPage}
            onClick={() => setPage(item)}
          >
            {item}
          </Button>
        );
      })}
    </div>
  );
};

export default PaginationButtons;
