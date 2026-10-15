import { useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import Textarea from '../../components/Textarea';
import { formatDate, formatTime } from '../../utils/date';

const MAX_REASON_LENGTH = 300;

export default function CancelAppointmentDialog({ appointment, loading, onConfirm, onClose }) {
  const [reason, setReason] = useState('');

  return (
    <ConfirmDialog
      open={Boolean(appointment)}
      title="Cancel appointment"
      message={
        appointment
          ? `Cancel ${appointment.patient?.name}'s appointment with ${appointment.doctor?.name} on ${formatDate(appointment.date)} at ${formatTime(appointment.startTime)}? The slot will become available again.`
          : ''
      }
      confirmLabel="Cancel appointment"
      loading={loading}
      onCancel={onClose}
      onConfirm={() => onConfirm(reason.trim())}
    >
      <Textarea
        label="Reason (optional)"
        value={reason}
        maxLength={MAX_REASON_LENGTH}
        onChange={(event) => setReason(event.target.value)}
        data-autofocus=""
      />
    </ConfirmDialog>
  );
}
