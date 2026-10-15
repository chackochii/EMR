import { useSocketStatus } from '../../hooks/useSocket';
import { SOCKET_STATUS } from '../../lib/socket';

const LABELS = {
  [SOCKET_STATUS.CONNECTED]: 'Live',
  [SOCKET_STATUS.CONNECTING]: 'Connecting',
  [SOCKET_STATUS.DISCONNECTED]: 'Offline',
};

export default function ConnectionIndicator() {
  const status = useSocketStatus();
  return (
    <span className={`connection connection--${status}`} role="status" title="Real-time updates connection">
      <span className="connection__dot" aria-hidden="true" />
      <span className="connection__label">
        <span className="sr-only">Real-time connection: </span>
        {LABELS[status]}
      </span>
    </span>
  );
}
