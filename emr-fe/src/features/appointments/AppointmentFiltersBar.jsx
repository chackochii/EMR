import { memo, useMemo, useState } from 'react';
import Input from '../../components/Input';
import Select from '../../components/Select';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import DatePicker from '../../components/DatePicker';
import { useDebouncedCallback } from '../../hooks/useDebounce';
import { APPOINTMENT_STATUS_LABELS } from '../../constants/statuses';
import { useDepartments } from '../doctors/hooks';

const TEXT_KEYS = ['patient', 'doctor', 'mobile'];
const STATUS_OPTIONS = Object.entries(APPOINTMENT_STATUS_LABELS).map(([value, label]) => ({ value, label }));

/** Text filters are debounced into the URL; selects and dates apply immediately. */
function AppointmentFiltersBar({ filters, onChange, showDoctorFilter }) {
  const { data: departments } = useDepartments();
  const [text, setText] = useState(() =>
    Object.fromEntries(TEXT_KEYS.map((key) => [key, filters[key] || ''])),
  );
  const emitText = useDebouncedCallback((patch) => onChange({ ...patch, page: 1 }), 400);

  const departmentOptions = useMemo(
    () => (departments || []).map(({ id, name }) => ({ value: id, label: name })),
    [departments],
  );

  const handleText = (key) => (event) => {
    const { value } = event.target;
    setText((prev) => ({ ...prev, [key]: value }));
    emitText({ [key]: value.trim() });
  };

  const handleImmediate = (key) => (event) => onChange({ [key]: event.target.value, page: 1 });

  const hasFilters = ['patient', 'doctor', 'mobile', 'departmentId', 'status', 'dateFrom', 'dateTo'].some(
    (key) => filters[key],
  );

  const hasAdvancedFilters = ['doctor', 'mobile', 'departmentId', 'status', 'dateFrom', 'dateTo'].some(
    (key) => filters[key],
  );
  const [moreOpen, setMoreOpen] = useState(hasAdvancedFilters);

  const clearAll = () => {
    setText({ patient: '', doctor: '', mobile: '' });
    onChange({
      patient: '',
      doctor: '',
      mobile: '',
      departmentId: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      page: 1,
    });
  };

  const advancedCount = ['doctor', 'mobile', 'departmentId', 'status', 'dateFrom', 'dateTo'].filter(
    (key) => filters[key],
  ).length;

  return (
    <div className="filters-bar" role="search" aria-label="Filter appointments">
      <div className="filters-bar__primary">
        <Input
          label="Search by patient"
          type="search"
          placeholder="Patient name or ID"
          value={text.patient}
          onChange={handleText('patient')}
        />
        <div className="filters-bar__buttons">
          <Button
            variant="secondary"
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={moreOpen}
            aria-controls="more-filters"
          >
            <Icon name="chevron-down" size={16} className={moreOpen ? 'icon--flip' : ''} />
            More filters{advancedCount ? ` (${advancedCount})` : ''}
          </Button>
          <Button variant="ghost" onClick={clearAll} disabled={!hasFilters}>
            Clear filters
          </Button>
        </div>
      </div>
      {moreOpen && (
        <div className="filters-bar__more" id="more-filters">
          {showDoctorFilter && (
            <Input label="Doctor" placeholder="Doctor name" value={text.doctor} onChange={handleText('doctor')} />
          )}
          <Input
            label="Mobile number"
            placeholder="10-digit number"
            inputMode="numeric"
            value={text.mobile}
            onChange={handleText('mobile')}
          />
          <Select
            label="Department"
            placeholder="All departments"
            options={departmentOptions}
            value={filters.departmentId || ''}
            onChange={handleImmediate('departmentId')}
          />
          <Select
            label="Status"
            placeholder="All statuses"
            options={STATUS_OPTIONS}
            value={filters.status || ''}
            onChange={handleImmediate('status')}
          />
          <DatePicker
            label="From date"
            clearable
            placeholder="Any date"
            value={filters.dateFrom || ''}
            max={filters.dateTo || undefined}
            onChange={(value) => onChange({ dateFrom: value, page: 1 })}
          />
          <DatePicker
            label="To date"
            clearable
            placeholder="Any date"
            value={filters.dateTo || ''}
            min={filters.dateFrom || undefined}
            onChange={(value) => onChange({ dateTo: value, page: 1 })}
          />
        </div>
      )}
    </div>
  );
}

export default memo(AppointmentFiltersBar);
