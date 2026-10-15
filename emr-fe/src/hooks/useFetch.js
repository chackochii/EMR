import { useCallback, useEffect, useRef, useState } from 'react';
import { extractApiError, isCanceled } from '../utils/extractApiError';

/**
 * Runs `fetcher(signal)` whenever `fetcher` (memoise it with useCallback) or `enabled` changes.
 * In-flight requests are aborted on change/unmount, so stale responses never overwrite fresh state.
 * `reload({ silent: true })` refetches without flipping back to the loading state.
 */
export function useFetch(fetcher, { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: enabled });
  const [reloadKey, setReloadKey] = useState(0);
  const silentRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, error: null, loading: false });
      return undefined;
    }
    const controller = new AbortController();
    const silent = silentRef.current;
    silentRef.current = false;
    if (!silent) setState((prev) => ({ ...prev, loading: true, error: null }));

    fetcher(controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => {
        if (isCanceled(error)) return;
        setState((prev) => ({ data: silent ? prev.data : null, error: extractApiError(error), loading: false }));
      });

    return () => controller.abort();
  }, [fetcher, enabled, reloadKey]);

  const reload = useCallback(({ silent = false } = {}) => {
    silentRef.current = silent;
    setReloadKey((key) => key + 1);
  }, []);

  return { ...state, reload };
}
