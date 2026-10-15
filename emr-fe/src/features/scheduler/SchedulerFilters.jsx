import { useEffect, useMemo } from 'react';
import Select from '../../components/Select';
import DatePicker from '../../components/DatePicker';
import { useDepartments, useDoctors } from '../doctors/hooks';

/** Department -> Doctor -> Date selector shared by the scheduler and the booking page. */
export default function SchedulerFilters({ departmentId, doctorId, date, onChange, minDate }) {
  const { data: departments, loading: loadingDepartments } = useDepartments();
  const { data: doctors, loading: loadingDoctors, error } = useDoctors(departmentId);

  const departmentOptions = useMemo(
    () => (departments || []).map(({ id, name }) => ({ value: id, label: name })),
    [departments],
  );
  const doctorOptions = useMemo(
    () => (doctors || []).map(({ id, name, specialization }) => ({
      value: id,
      label: specialization ? `${name} · ${specialization}` : name,
    })),
    [doctors],
  );

  // A doctor account (or a department with a single doctor) needs no manual choice.
  useEffect(() => {
    if (doctors?.length === 1 && doctors[0].id !== doctorId) onChange({ doctorId: doctors[0].id });
  }, [doctors, doctorId, onChange]);

  return (
    <div className="filters-grid">
      <Select
        label="Department"
        placeholder={loadingDepartments ? 'Loading…' : 'All departments'}
        value={departmentId}
        options={departmentOptions}
        onChange={(event) => onChange({ departmentId: event.target.value, doctorId: '' })}
      />
      <Select
        label="Doctor"
        placeholder={loadingDoctors ? 'Loading…' : 'Select doctor'}
        value={doctorId}
        options={doctorOptions}
        error={error?.message}
        onChange={(event) => onChange({ doctorId: event.target.value })}
      />
      <DatePicker label="Date" value={date} min={minDate} onChange={(value) => value && onChange({ date: value })} />
    </div>
  );
}
