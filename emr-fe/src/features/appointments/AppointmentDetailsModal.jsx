import Modal from '../../components/Modal';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import { capitalize, formatPatientAge } from '../../utils/formatters';
import { formatDate, formatDateTime, formatTimeRange } from '../../utils/date';

function Detail({ label, children }) {
  return (
    <div className="details__item">
      <dt>{label}</dt>
      <dd>{children || '—'}</dd>
    </div>
  );
}

export default function AppointmentDetailsModal({ open, appointment, onClose }) {
  if (!appointment) return null;
  const { patient, doctor, department } = appointment;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Appointment details"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="details__status">
        <StatusBadge status={appointment.status} />
        <span>
          {formatDate(appointment.date)} · {formatTimeRange(appointment.startTime, appointment.endTime)}
        </span>
      </div>

      <h3 className="details__heading">Patient</h3>
      <dl className="details">
        <Detail label="Name">{patient?.name}</Detail>
        <Detail label="Patient ID">{patient?.patientId}</Detail>
        <Detail label="Mobile">{patient?.mobile}</Detail>
        <Detail label="Gender / age">
          {capitalize(patient?.gender)} · {formatPatientAge(patient)}
        </Detail>
      </dl>

      <h3 className="details__heading">Visit</h3>
      <dl className="details">
        <Detail label="Doctor">{doctor?.name}</Detail>
        <Detail label="Specialization">{doctor?.specialization}</Detail>
        <Detail label="Department">{department?.name}</Detail>
        <Detail label="Purpose">{appointment.purpose}</Detail>
        <Detail label="Notes">{appointment.notes}</Detail>
        <Detail label="Booked on">{formatDateTime(appointment.createdAt)}</Detail>
        {appointment.arrivedAt && <Detail label="Arrived at">{formatDateTime(appointment.arrivedAt)}</Detail>}
        {appointment.cancelledAt && <Detail label="Cancelled at">{formatDateTime(appointment.cancelledAt)}</Detail>}
        {appointment.cancelReason && <Detail label="Cancel reason">{appointment.cancelReason}</Detail>}
      </dl>
    </Modal>
  );
}
