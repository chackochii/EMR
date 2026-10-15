import { memo } from 'react';
import Icon from '../Icon';
import { PAGE_SIZE_OPTIONS } from '../../constants';

const buildPages = (page, totalPages) => {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? ['gap', p] : [p]));
};

function Pagination({ page, totalPages, total, limit, onPageChange, onLimitChange }) {
  if (!total) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <nav className="pagination" aria-label="Pagination">
      <p className="pagination__summary">
        Showing {from}–{to} of {total}
      </p>
      <div className="pagination__controls">
        {onLimitChange && (
          <label className="pagination__size">
            <span className="sr-only">Rows per page</span>
            <select className="input select input--sm" value={limit} onChange={(e) => onLimitChange(Number(e.target.value))}>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          className="pagination__btn"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <Icon name="chevron-down" size={16} className="icon--rot-90" />
        </button>
        {buildPages(page, totalPages).map((item, index) =>
          item === 'gap' ? (
            <span key={`gap-${index}`} className="pagination__gap" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={`pagination__btn ${item === page ? 'pagination__btn--active' : ''}`}
              onClick={() => onPageChange(item)}
              aria-current={item === page ? 'page' : undefined}
              aria-label={`Page ${item}`}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          className="pagination__btn"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <Icon name="chevron-down" size={16} className="icon--rot-neg-90" />
        </button>
      </div>
    </nav>
  );
}

export default memo(Pagination);
