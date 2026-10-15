import apiClient, { unwrap } from './apiClient';

export const authService = {
  login: (credentials) => apiClient.post('/auth/login', credentials).then(unwrap),
  logout: (refreshToken) => apiClient.post('/auth/logout', { refreshToken }),
  me: () => apiClient.get('/auth/me').then((response) => unwrap(response).user),
};
