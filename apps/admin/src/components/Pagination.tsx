interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
  if (pageCount <= 1) return null;
  const canPrevious = page > 1;
  const canNext = page < pageCount;
  return (
    <nav className="pagination" aria-label="Pagination">
      <button type="button" className="secondary-button" disabled={!canPrevious} onClick={() => onPageChange(page - 1)}>Previous</button>
      <span aria-live="polite">Page {page} of {pageCount}</span>
      <button type="button" className="secondary-button" disabled={!canNext} onClick={() => onPageChange(page + 1)}>Next</button>
    </nav>
  );
}
