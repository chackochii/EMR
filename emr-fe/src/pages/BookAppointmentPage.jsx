import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Input from '../components/Input';
import Textarea from '../components/Textarea';
import SlotGrid from '../components/SlotGrid';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { Skeleton } from '../components/Loading';
import SchedulerFilters from '../features/scheduler/SchedulerFilters';
import SlotSummary from '../features/scheduler/SlotSummary';
import { useSlots } from '../features/scheduler/useSlots';
import PatientSearch from '../features/booking/PatientSearch';
import NewPatientForm from '../features/booking/NewPatientForm';
import {
  BOOKING_FORM_FIELDS,
  existingPatientBookingSchema,
  newPatientBookingSchema,
} from '../features/booking/schemas';
import { appointmentService } from '../services/appointmentService';
import { useToast } from '../hooks/useToast';
import { ROUTES } from '../constants/routes';
import { SLOT_STATUS } from '../constants/statuses';
import { applyFieldErrors, extractApiError } from '../utils/extractApiError';
import { compactObject } from '../utils/formatters';
import { formatLongDate, formatTimeRange, todayISO } from '../utils/date';

const DEFAULT_VALUES = {
  purpose: '',
  notes: '',
  newPatient: { name: '', mobile: '', gender: '', age: '', dateOfBirth: '', email: '' },
};

const buildPatientPayload = (mode, patient, newPatient) => {
  if (mode === 'existing') return { patientId: patient.id };
  return {
    newPatient: compactObject({
      ...newPatient,
      age: newPatient.age === '' ? '' : Number(newPatient.age),
    }),
  };
};

function StepHead({ id, step, title, help }) {
  return (
    <div className="step-head">
      <span className="step-head__num" aria-hidden="true">
        {step}
      </span>
      <div>
        <h2 id={id} className="step-head__title">
          <span className="sr-only">Step {step}: </span>
          {title}
        </h2>
        <p className="step-head__help">{help}</p>
      </div>
    </div>
  );
}

export default function BookAppointmentPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();

  const [mode, setMode] = useState('existing');
  const [patient, setPatient] = useState(null);
  const [patientError, setPatientError] = useState('');
  const [slotError, setSlotError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selection, setSelection] = useState(() => {
    const requestedDate = params.get('date');
    return {
      departmentId: '',
      doctorId: params.get('doctorId') || '',
      date: requestedDate && requestedDate >= todayISO() ? requestedDate : todayISO(),
      startTime: params.get('startTime') || '',
    };
  });

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(mode === 'new' ? newPatientBookingSchema : existingPatientBookingSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { data: slotData, loading: loadingSlots, error: slotsError, reload: reloadSlots } = useSlots(
    selection.doctorId,
    selection.date,
  );

  const selectedSlot = useMemo(
    () =>
      slotData?.slots.find((slot) => slot.startTime === selection.startTime && slot.status === SLOT_STATUS.AVAILABLE),
    [slotData, selection.startTime],
  );

  const handleSelectionChange = useCallback((patch) => {
    // Changing doctor or date invalidates the previously chosen time.
    const resetsTime = 'doctorId' in patch || 'date' in patch;
    setSelection((prev) => ({ ...prev, ...patch, ...(resetsTime ? { startTime: '' } : {}) }));
    setSlotError('');
  }, []);

  const handleSelectSlot = useCallback((slot) => {
    setSelection((prev) => ({ ...prev, startTime: slot.startTime }));
    setSlotError('');
  }, []);

  const handleSelectPatient = useCallback((selected) => {
    setPatient(selected);
    setPatientError('');
  }, []);

  const submit = async (values) => {
    setSubmitting(true);
    try {
      await appointmentService.create({
        doctorId: selection.doctorId,
        date: selection.date,
        startTime: selection.startTime,
        ...compactObject({ purpose: values.purpose, notes: values.notes }),
        ...buildPatientPayload(mode, patient, values.newPatient),
      });
      toast.success('Appointment booked successfully');
      navigate(ROUTES.APPOINTMENTS);
    } catch (error) {
      const apiError = extractApiError(error, 'Could not book the appointment.');
      if (apiError.status === 409) {
        toast.error(apiError.message || 'That slot was just booked. Please pick another.');
        setSelection((prev) => ({ ...prev, startTime: '' }));
        reloadSlots();
      } else if (
        apiError.status === 422 &&
        applyFieldErrors(setError, apiError.fieldErrors, BOOKING_FORM_FIELDS)
      ) {
        toast.error('Please correct the highlighted fields.');
      } else {
        toast.error(apiError.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = (event) => {
    const missingPatient = mode === 'existing' && !patient;
    const missingDoctor = !selection.doctorId;
    const missingSlot = !selectedSlot;
    setPatientError(missingPatient ? 'Search and select a patient' : '');
    if (missingDoctor) setSlotError('Select a doctor');
    else if (missingSlot) setSlotError('Select an available time slot');
    return handleSubmit((values) => {
      if (missingPatient || missingDoctor || missingSlot) return undefined;
      return submit(values);
    })(event);
  };

  const renderSlots = () => {
    if (!selection.doctorId) return <EmptyState title="Select a doctor" description="Pick a doctor to see open slots." />;
    if (loadingSlots) {
      return (
        <div className="slot-grid" aria-busy="true">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} height="2.5rem" />
          ))}
        </div>
      );
    }
    if (slotsError) return <ErrorState message={slotsError.message} onRetry={reloadSlots} />;
    if (!slotData?.isWorkingDay || slotData.slots.length === 0) {
      return <EmptyState title="No slots on this day" description="Choose another date or doctor." />;
    }
    return (
      <>
        <SlotSummary slots={slotData.slots} />
        <SlotGrid slots={slotData.slots} selectedTime={selection.startTime} onSelectAvailable={handleSelectSlot} />
      </>
    );
  };

  return (
    <>
      <PageHeader title="Book appointment" subtitle="Register the patient, choose a slot and confirm." />
      <form onSubmit={handleFormSubmit} noValidate className="stack">
        <section className="card" aria-labelledby="patient-heading">
          <StepHead id="patient-heading" step={1} title="Patient" help="Find an existing patient or register a new one." />
          <div className="segmented" role="group" aria-label="Patient type">
            {[
              { value: 'existing', label: 'Existing patient' },
              { value: 'new', label: 'New patient' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={`segmented__btn ${mode === option.value ? 'segmented__btn--active' : ''}`}
                aria-pressed={mode === option.value}
                onClick={() => setMode(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {mode === 'existing' ? (
            <PatientSearch selected={patient} onSelect={handleSelectPatient} error={patientError} />
          ) : (
            <NewPatientForm register={register} control={control} errors={errors.newPatient} />
          )}
        </section>

        <section className="card" aria-labelledby="slot-heading">
          <StepHead id="slot-heading" step={2} title="Doctor and time" help="Choose who they are seeing, then pick an open time." />
          <SchedulerFilters
            departmentId={selection.departmentId}
            doctorId={selection.doctorId}
            date={selection.date}
            minDate={todayISO()}
            onChange={handleSelectionChange}
          />
          <div className="slot-section" aria-live="polite">
            {renderSlots()}
            {slotError && (
              <p className="field__error" role="alert">
                {slotError}
              </p>
            )}
            {selectedSlot && (
              <p className="slot-section__selected">
                Selected: <strong>{formatLongDate(selection.date)}</strong>,{' '}
                <strong>{formatTimeRange(selectedSlot.startTime, selectedSlot.endTime)}</strong>
              </p>
            )}
          </div>
        </section>

        <section className="card" aria-labelledby="visit-heading">
          <StepHead id="visit-heading" step={3} title="Details" help="A short reason helps the doctor prepare." />
          <div className="stack stack--sm">
            <Input label="Purpose of visit" required error={errors.purpose?.message} {...register('purpose')} />
            <Textarea label="Notes (optional)" error={errors.notes?.message} {...register('notes')} />
          </div>
        </section>

        <div className="form-actions">
          <Button variant="ghost" onClick={() => navigate(ROUTES.SCHEDULER)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Book appointment
          </Button>
        </div>
      </form>
    </>
  );
}
