/**
 * Access token lives in memory only (gone after a reload, which limits XSS exposure).
 * Refresh token is persisted in localStorage so a session survives reloads.
 * Tradeoff: localStorage is readable by any script on the page, so an XSS bug could
 * steal the refresh token; httpOnly cookies would be safer but the API contract is token based.
 */
const REFRESH_KEY = 'emr.refreshToken';

let accessToken = null;
const listeners = new Set();

const readRefresh = () => {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
};

const writeRefresh = (value) => {
  try {
    if (value) localStorage.setItem(REFRESH_KEY, value);
    else localStorage.removeItem(REFRESH_KEY);
  } catch {
    /* storage unavailable: the session simply will not survive a reload */
  }
};

export const getAccessToken = () => accessToken;
export const getRefreshToken = () => readRefresh();

export function setTokens({ accessToken: access, refreshToken }) {
  accessToken = access;
  if (refreshToken) writeRefresh(refreshToken);
  listeners.forEach((listener) => listener(accessToken));
}

export function clearTokens() {
  accessToken = null;
  writeRefresh(null);
  listeners.forEach((listener) => listener(null));
}

export function subscribeToTokens(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
