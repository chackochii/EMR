import { useCallback, useState } from 'react';
import { DEFAULT_PAGE_SIZE } from '../constants';

export function usePagination(initialLimit = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [limit, setLimitState] = useState(initialLimit);

  const setLimit = useCallback((next) => {
    setLimitState(next);
    setPage(1);
  }, []);

  return { page, limit, setPage, setLimit };
}
