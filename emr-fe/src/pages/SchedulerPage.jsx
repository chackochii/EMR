import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import SlotGrid from '../components/SlotGrid';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { Skeleton } from '../components/Loading';
import SchedulerFilters from '../features/scheduler/SchedulerFilters';
import SlotSummary from '../features/scheduler/SlotSummary';
import BookedSlotDetails from '../features/scheduler/BookedSlotDetails';
import { useSlots } from '../features/scheduler/useSlots';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useUrlParams } from '../hooks/useUrlParams';
import { useDebouncedCallback } from '../hooks/useDebounce';
import { useSchedulerSocket } from '../hooks/useSocket';
import { ROUTES } from '../constants/routes';
import { formatLongDate, formatTime, todayISO } from '../utils/date';

const EVENT_LABELS = {
  'appointment:created': 'booked',
  'appointment:updated': 'updated',
  'appointment:cancelled': 'cancelled',
};

export default function SchedulerPage() {
  const { can } = useAuth();
  const canBook = can('BOOK');
  const navigate = useNavigate();
  const toast = useToast();
  const [params, updateParams] = useUrlParams();
  const [bookedSlot, setBookedSlot] = useState(null);

  const departmentId = params.get('departmentId') || '';
  const doctorId = params.get('doctorId') || '';
  const date = params.get('date') || todayISO();

  const { data, loading, error, reload } = useSlots(doctorId, date);

  const refreshSlots = useDebouncedCallback(() => reload({ silent: true }), 300);

  const handleLiveEvent = useCallback(
    (eventName, appointment) => {
      if (!appointment || appointment.doctor?.id !== doctorId || appointment.date !== date) return;
      refreshSlots();
      toast.info(`Live update: ${formatTime(appointment.startTime)} slot ${EVENT_LABELS[eventName]}`);
    },
    [doctorId, date, refreshSlots, toast],
  );
  useSchedulerSocket(doctorId, handleLiveEvent);

  const handleSelectAvailable = useCallback(
    (slot) => {
      const query = new URLSearchParams({ doctorId, date, startTime: slot.startTime });
      navigate(`${ROUTES.BOOK}?${query}`);
    },
    [navigate, doctorId, date],
  );
  const handleSelectBooked = useCallback((slot) => setBookedSlot(slot), []);
  const closeDetails = useCallback(() => setBookedSlot(null), []);

  const renderSlots = () => {
    if (!doctorId) {
      return <EmptyState title="Select a doctor" description="Choose a doctor and date to see their slots." />;
    }
    if (loading) {
      return (
        <div className="slot-grid" aria-busy="true">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} height="2.5rem" />
          ))}
        </div>
      );
    }
    if (error) return <ErrorState message={error.message} onRetry={reload} />;
    if (!data?.isWorkingDay || data.slots.length === 0) {
      return (
        <EmptyState
          title="No slots on this day"
          description="The doctor is not scheduled to work on the selected date."
        />
      );
    }
    return (
      <>
        <SlotSummary slots={data.slots} />
        <SlotGrid
          slots={data.slots}
          onSelectAvailable={canBook ? handleSelectAvailable : undefined}
          onSelectBooked={handleSelectBooked}
        />
        {canBook && <p className="hint">Select an available slot to book an appointment.</p>}
      </>
    );
  };

  return (
    <>
      <PageHeader title="Scheduler" subtitle="Live availability by doctor and day." />
      <section className="card">
        <SchedulerFilters departmentId={departmentId} doctorId={doctorId} date={date} onChange={updateParams} />
      </section>
      <section className="card" aria-live="polite">
        {doctorId && data && (
          <h2 className="card__title">
            {formatLongDate(date)}
            {data.slotDuration ? ` · ${data.slotDuration} min slots` : ''}
          </h2>
        )}
        {renderSlots()}
      </section>
      {bookedSlot && (
        <BookedSlotDetails slot={bookedSlot} doctorId={doctorId} date={date} onClose={closeDetails} />
      )}
    </>
  );
}
