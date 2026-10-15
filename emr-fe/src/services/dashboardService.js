import apiClient, { unwrap } from './apiClient';

export const dashboardService = {
  stats: (signal) => apiClient.get('/dashboard/stats', { signal }).then(unwrap),
};
