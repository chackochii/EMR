import axios from 'axios';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '../lib/tokenStorage';

const BASE_URL = import.meta.env.VITE_API_URL;
const AUTH_PATHS = ['/auth/login', '/auth/refresh'];

const apiClient = axios.create({ baseURL: BASE_URL, timeout: 20000 });

let onAuthFailure = () => {};
export const setAuthFailureHandler = (handler) => {
  onAuthFailure = handler;
};

let refreshPromise = null;

/** Single-flight refresh: concurrent callers share one in-flight request. */
export function refreshSession() {
  if (!refreshPromise) {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return Promise.reject(new Error('No refresh token'));
    // Plain axios (not apiClient) so this call never re-enters the interceptors.
    refreshPromise = axios
      .post(`${BASE_URL}/auth/refresh`, { refreshToken })
      .then((response) => {
        setTokens(response.data.data);
        return response.data.data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const isAuthCall = AUTH_PATHS.some((path) => config?.url?.includes(path));
    if (response?.status !== 401 || !config || config._retried || isAuthCall || !getRefreshToken()) {
      return Promise.reject(error);
    }
    config._retried = true;
    try {
      const token = await refreshSession();
      config.headers.Authorization = `Bearer ${token}`;
      return apiClient(config);
    } catch (refreshError) {
      clearTokens();
      onAuthFailure();
      return Promise.reject(refreshError);
    }
  },
);

export const unwrap = (response) => response.data.data;
export const unwrapList = (response) => ({ items: response.data.data, meta: response.data.meta });

export default apiClient;
