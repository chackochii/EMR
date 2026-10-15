import { useCallback, useMemo } from 'react';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import ErrorState from '../../components/ErrorState';
import { LoadingState } from '../../components/Loading';
import { useFetch } from '../../hooks/useFetch';
import { appointmentService } from '../../services/appointmentService';
import AppointmentDetailsModal from '../appointments/AppointmentDetailsModal';

/** Resolves a booked slot to its appointment (via the list endpoint) and shows the details. */
export default function BookedSlotDetails({ slot, doctorId, date, onClose }) {
  const fetcher = useCallback(
    (signal) =>
      appointmentService.list({ doctorId, dateFrom: date, dateTo: date, limit: 100 }, signal).then(({ items }) => items),
    [doctorId, date],
  );
  const { data, loading, error, reload } = useFetch(fetcher);

  const appointment = useMemo(
    () => data?.find((item) => (slot.appointmentId ? item.id === slot.appointmentId : item.startTime === slot.startTime)),
    [data, slot],
  );

  if (appointment) return <AppointmentDetailsModal open appointment={appointment} onClose={onClose} />;

  return (
    <Modal open onClose={onClose} title="Appointment details" footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      {loading && <LoadingState label="Loading appointment…" />}
      {error && <ErrorState message={error.message} onRetry={reload} />}
      {!loading && !error && <p>The appointment for this slot could not be found. It may have just changed.</p>}
    </Modal>
  );
}
