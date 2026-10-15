import { useCallback, useState } from 'react';
import { appointmentService } from '../../services/appointmentService';
import { useToast } from '../../hooks/useToast';
import { extractApiError } from '../../utils/extractApiError';

/** Arrive / complete / cancel mutations with per-row busy state and toasts. `onChanged` should be stable. */
export function useAppointmentActions(onChanged) {
  const toast = useToast();
  const [busyId, setBusyId] = useState(null);

  const perform = useCallback(
    async (id, request, successMessage) => {
      setBusyId(id);
      try {
        await request();
        toast.success(successMessage);
        onChanged();
        return true;
      } catch (error) {
        toast.error(extractApiError(error).message);
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [toast, onChanged],
  );

  const arrive = useCallback(
    (id) => perform(id, () => appointmentService.arrive(id), 'Patient marked as arrived'),
    [perform],
  );
  const complete = useCallback(
    (id) => perform(id, () => appointmentService.update(id, { status: 'completed' }), 'Appointment completed'),
    [perform],
  );
  const cancel = useCallback(
    (id, reason) => perform(id, () => appointmentService.cancel(id, reason), 'Appointment cancelled'),
    [perform],
  );

  return { busyId, arrive, complete, cancel };
}
