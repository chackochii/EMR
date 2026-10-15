import { useCallback } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { slotService } from '../../services/slotService';

export function useSlots(doctorId, date) {
  const fetcher = useCallback((signal) => slotService.list({ doctorId, date }, signal), [doctorId, date]);
  return useFetch(fetcher, { enabled: Boolean(doctorId && date) });
}
