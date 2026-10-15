import apiClient, { unwrap } from './apiClient';

export const slotService = {
  list: ({ doctorId, date }, signal) =>
    apiClient.get('/slots', { params: { doctorId, date }, signal }).then(unwrap),
};
