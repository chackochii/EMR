import apiClient, { unwrap } from './apiClient';

export const doctorService = {
  list: (params, signal) => apiClient.get('/doctors', { params, signal }).then(unwrap),
  getSchedule: (doctorId, signal) => apiClient.get(`/doctors/${doctorId}/schedule`, { signal }).then(unwrap),
  updateSchedule: (doctorId, body) => apiClient.put(`/doctors/${doctorId}/schedule`, body).then(unwrap),
};
