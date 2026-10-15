import apiClient, { unwrap } from './apiClient';

export const departmentService = {
  list: (signal) => apiClient.get('/departments', { signal }).then(unwrap),
};
