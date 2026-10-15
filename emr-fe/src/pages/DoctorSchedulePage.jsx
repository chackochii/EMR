import { useCallback, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import Select from '../components/Select';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { LoadingState } from '../components/Loading';
import ScheduleEditor from '../features/doctors/ScheduleEditor';
import { useDoctors } from '../features/doctors/hooks';
import { useFetch } from '../hooks/useFetch';
import { useUrlParams } from '../hooks/useUrlParams';
import { doctorService } from '../services/doctorService';

export default function DoctorSchedulePage() {
  const [params, updateParams] = useUrlParams();
  const doctorId = params.get('doctorId') || '';
  const { data: doctors, loading: loadingDoctors, error: doctorsError, reload: reloadDoctors } = useDoctors();

  // A doctor who has never been configured may answer 404; treat that as an empty schedule.
  const fetcher = useCallback(
    (signal) =>
      doctorService.getSchedule(doctorId, signal).catch((error) => {
        if (error?.response?.status === 404) return null;
        throw error;
      }),
    [doctorId],
  );
  const { data: schedule, loading, error, reload } = useFetch(fetcher, { enabled: Boolean(doctorId) });

  const options = useMemo(
    () =>
      (doctors || []).map((doctor) => ({
        value: doctor.id,
        label: `${doctor.name}${doctor.department ? ` · ${doctor.department.name}` : ''}${doctor.hasSchedule ? '' : ' (no schedule)'}`,
      })),
    [doctors],
  );

  const renderEditor = () => {
    if (!doctorId) return <EmptyState title="Select a doctor" description="Choose a doctor to view or edit their weekly schedule." />;
    if (loading) return <LoadingState label="Loading schedule…" />;
    if (error) return <ErrorState message={error.message} onRetry={reload} />;
    return <ScheduleEditor key={doctorId} doctorId={doctorId} schedule={schedule} onSaved={reloadDoctors} />;
  };

  return (
    <>
      <PageHeader title="Doctor schedules" subtitle="Configure working days, sessions, slot duration and breaks." />
      <section className="card">
        <div className="filters-grid filters-grid--single">
          <Select
            label="Doctor"
            placeholder={loadingDoctors ? 'Loading…' : 'Select doctor'}
            options={options}
            value={doctorId}
            error={doctorsError?.message}
            onChange={(event) => updateParams({ doctorId: event.target.value })}
          />
        </div>
      </section>
      {renderEditor()}
    </>
  );
}
