import apiClient, { unwrap } from './apiClient';

export const patientService = {
  search: (search, signal) =>
    apiClient.get('/patients', { params: { search, limit: 10 }, signal }).then(unwrap),
  create: (body) => apiClient.post('/patients', body).then(unwrap),
};
