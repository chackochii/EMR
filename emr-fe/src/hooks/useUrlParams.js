import { useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Query-string state helper. `update(patch)` merges a patch ('' / null / undefined removes a key)
 * and keeps a stable identity so it is safe to pass to memoised children and effects.
 */
export function useUrlParams() {
  const [params, setParams] = useSearchParams();
  const setParamsRef = useRef(setParams);

  useEffect(() => {
    setParamsRef.current = setParams;
  });

  const update = useCallback((patch) => {
    setParamsRef.current(
      (previous) => {
        const next = new URLSearchParams(previous);
        Object.entries(patch).forEach(([key, value]) => {
          if (value === '' || value == null) next.delete(key);
          else next.set(key, String(value));
        });
        return next;
      },
      { replace: true },
    );
  }, []);

  return [params, update];
}
