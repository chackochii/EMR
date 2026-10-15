import { memo } from 'react';
import { APPOINTMENT_STATUS_LABELS } from '../../constants/statuses';

function StatusBadge({ status }) {
  return <span className={`badge badge--${status}`}>{APPOINTMENT_STATUS_LABELS[status] || status}</span>;
}

export default memo(StatusBadge);
