import { Button } from './Button';
export function Pagination({ page, onPage, hasNext }) {
  return <nav className="pagination" aria-label="Phân trang">
    <Button variant="secondary" disabled={page === 1} onClick={() => onPage(page - 1)}>Trước</Button>
    <span>Trang {page}</span>
    <Button variant="secondary" disabled={!hasNext} onClick={() => onPage(page + 1)}>Sau</Button>
  </nav>;
}
