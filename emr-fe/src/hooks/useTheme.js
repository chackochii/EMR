import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'emr-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

const readStored = () => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
};

const systemTheme = () => (window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light');

/** Theme is explicit (persisted) once the user toggles; until then it follows the OS preference. */
export function useTheme() {
  const [stored, setStored] = useState(readStored);
  const [system, setSystem] = useState(systemTheme);

  useEffect(() => {
    const query = window.matchMedia?.(DARK_QUERY);
    if (!query) return undefined;
    const handler = (event) => setSystem(event.matches ? 'dark' : 'light');
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (stored) document.documentElement.setAttribute('data-theme', stored);
  }, [stored]);

  const theme = stored || system;

  const toggle = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setStored(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable: the choice still applies for this session */
    }
  }, [theme]);

  return { theme, toggle };
}
