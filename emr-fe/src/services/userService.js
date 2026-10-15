import apiClient, { unwrap, unwrapList } from './apiClient';

export const userService = {
  create: (body) => apiClient.post('/users', body).then(unwrap),
  list: (params, signal) => apiClient.get('/users', { params, signal }).then(unwrapList),
};
