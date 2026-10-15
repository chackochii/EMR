import { memo } from 'react';
import StatusBadge from '../../components/StatusBadge';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import { avatarTone, getInitials } from '../../utils/formatters';
import { formatDate, formatDateTime, formatTimeRange } from '../../utils/date';
import { ACTIONS, getAvailableActions } from './permissions';

const COLUMNS = [
  { key: 'patient', label: 'Patient' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'doctor', label: 'Doctor' },
  { key: 'department', label: 'Department' },
  { key: 'date', label: 'Date', sortable: true },
  { key: 'startTime', label: 'Time', sortable: true },
  { key: 'purpose', label: 'Purpose' },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'createdAt', label: 'Booked on', sortable: true },
  { key: 'actions', label: 'Actions' },
];

const ACTION_LABELS = {
  [ACTIONS.VIEW]: 'View',
  [ACTIONS.ARRIVE]: 'Arrive',
  [ACTIONS.EDIT]: 'Edit',
  [ACTIONS.COMPLETE]: 'Complete',
  [ACTIONS.CANCEL]: 'Cancel',
};

const ACTION_ICONS = {
  [ACTIONS.VIEW]: 'eye',
  [ACTIONS.ARRIVE]: 'user-check',
  [ACTIONS.EDIT]: 'edit',
  [ACTIONS.COMPLETE]: 'check-circle',
  [ACTIONS.CANCEL]: 'ban',
};

const AppointmentRow = memo(function AppointmentRow({ appointment, role, busy, onAction }) {
  const { patient, doctor, department } = appointment;
  return (
    <tr className={appointment.status === 'cancelled' ? 'row--muted' : undefined}>
      <td data-label="Patient">
        <div className="person">
          <span className={`avatar avatar--${avatarTone(patient?.name)}`} aria-hidden="true">
            {getInitials(patient?.name)}
          </span>
          <span className="person__text">
            <span className="cell-strong">{patient?.name}</span>
            <span className="cell-sub">{patient?.patientId}</span>
            <span className="cell-sub cell-sub--inline">{patient?.mobile}</span>
          </span>
        </div>
      </td>
      <td data-label="Mobile">{patient?.mobile}</td>
      <td data-label="Doctor">
        <span className="cell-strong">{doctor?.name}</span>
        <span className="cell-sub">{doctor?.specialization}</span>
        <span className="cell-sub cell-sub--inline">{department?.name}</span>
      </td>
      <td data-label="Department">{department?.name}</td>
      <td data-label="Date">{formatDate(appointment.date)}</td>
      <td data-label="Time">{formatTimeRange(appointment.startTime, appointment.endTime)}</td>
      <td data-label="Purpose" className="cell-wrap">
        {appointment.purpose}
      </td>
      <td data-label="Status">
        <StatusBadge status={appointment.status} />
      </td>
      <td data-label="Booked on">{formatDateTime(appointment.createdAt)}</td>
      <td data-label="Actions" className="cell-actions">
        <div className="row-actions">
          {getAvailableActions(role, appointment.status).map((action) => (
            <Button
              key={action}
              size="sm"
              variant={action === ACTIONS.CANCEL ? 'danger-ghost' : 'ghost'}
              className="icon-btn icon-btn--action"
              disabled={busy}
              title={ACTION_LABELS[action]}
              aria-label={`${ACTION_LABELS[action]} appointment for ${patient?.name}`}
              onClick={() => onAction(action, appointment)}
            >
              <Icon name={ACTION_ICONS[action]} size={16} />
              <span className="icon-btn__label" aria-hidden="true">
                {ACTION_LABELS[action]}
              </span>
            </Button>
          ))}
        </div>
      </td>
    </tr>
  );
});

function SortHeader({ column, sortBy, sortOrder, onSort }) {
  const active = sortBy === column.key;
  const ariaSort = active ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none';
  return (
    <th scope="col" aria-sort={column.sortable ? ariaSort : undefined} className={column.key === 'actions' ? 'cell-actions' : undefined}>
      {column.sortable ? (
        <button type="button" className="sort-btn" onClick={() => onSort(column.key)}>
          {column.label}
          <span className="sort-btn__icon" aria-hidden="true">
            <Icon name={active ? (sortOrder === 'asc' ? 'sort-asc' : 'sort-desc') : 'sort'} size={14} />
          </span>
        </button>
      ) : (
        column.label
      )}
    </th>
  );
}

function AppointmentTable({ appointments, role, busyId, sortBy, sortOrder, onSort, onAction }) {
  return (
    <div className="table-wrap">
      <table className="table table--cards table--appointments">
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <SortHeader key={column.key} column={column} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
            ))}
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => (
            <AppointmentRow
              key={appointment.id}
              appointment={appointment}
              role={role}
              busy={busyId === appointment.id}
              onAction={onAction}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default memo(AppointmentTable);
