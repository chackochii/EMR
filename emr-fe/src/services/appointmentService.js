import apiClient, { unwrap, unwrapList } from './apiClient';

export const appointmentService = {
  list: (params, signal) => apiClient.get('/appointments', { params, signal }).then(unwrapList),
  create: (body) => apiClient.post('/appointments', body).then(unwrap),
  update: (id, body) => apiClient.put(`/appointments/${id}`, body).then(unwrap),
  cancel: (id, reason) =>
    apiClient.delete(`/appointments/${id}`, { data: reason ? { reason } : {} }).then(unwrap),
  arrive: (id) => apiClient.post(`/appointments/${id}/arrive`).then(unwrap),
};
