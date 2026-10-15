import { useCallback, useEffect, useRef, useState } from 'react';
import { extractApiError } from '../utils/extractApiError';

/** Wraps a mutation (submit/click) with loading + error state; ignores results after unmount. */
export function useAsync(action) {
  const [state, setState] = useState({ loading: false, error: null });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (...args) => {
      setState({ loading: true, error: null });
      try {
        const result = await action(...args);
        if (mounted.current) setState({ loading: false, error: null });
        return result;
      } catch (error) {
        const apiError = extractApiError(error);
        if (mounted.current) setState({ loading: false, error: apiError });
        throw apiError;
      }
    },
    [action],
  );

  return { ...state, run };
}
