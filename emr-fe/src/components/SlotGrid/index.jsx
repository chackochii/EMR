import { memo, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../Icon';
import { SLOT_STATUS } from '../../constants/statuses';
import { formatTime, formatTimeRange, timeToMinutes } from '../../utils/date';

const STATUS_TEXT = {
  [SLOT_STATUS.AVAILABLE]: 'available',
  [SLOT_STATUS.BOOKED]: 'booked',
  [SLOT_STATUS.PAST]: 'past',
};

const SlotButton = memo(function SlotButton({ slot, selected, onSelectAvailable, onSelectBooked }) {
  const { startTime, endTime, status } = slot;
  const handler = status === SLOT_STATUS.AVAILABLE ? onSelectAvailable : status === SLOT_STATUS.BOOKED ? onSelectBooked : null;

  // Visual cue only: briefly pulse a slot whose status changed after a live update.
  const previousStatus = useRef(status);
  const [changed, setChanged] = useState(false);
  useEffect(() => {
    if (previousStatus.current === status) return undefined;
    previousStatus.current = status;
    setChanged(true);
    const timer = setTimeout(() => setChanged(false), 1600);
    return () => clearTimeout(timer);
  }, [status]);

  return (
    <button
      type="button"
      className={`slot slot--${status} ${selected ? 'slot--selected' : ''} ${changed ? 'slot--changed' : ''}`.replace(/\s+/g, ' ').trim()}
      disabled={!handler}
      aria-pressed={status === SLOT_STATUS.AVAILABLE && onSelectAvailable ? selected : undefined}
      aria-label={`${formatTimeRange(startTime, endTime)}, ${STATUS_TEXT[status]}${selected ? ', selected' : ''}`}
      onClick={() => handler?.(slot)}
    >
      <span className="slot__time">{formatTime(startTime)}</span>
      {status === SLOT_STATUS.BOOKED && (
        <span className="slot__tag" aria-hidden="true">
          <Icon name="lock" size={12} strokeWidth={2.2} />
          Booked
        </span>
      )}
    </button>
  );
});

/** Builds the render list, inserting a "Break" marker wherever consecutive slots are not contiguous. */
const withBreaks = (slots) =>
  slots.flatMap((slot, index) => {
    const previous = slots[index - 1];
    if (previous && timeToMinutes(slot.startTime) > timeToMinutes(previous.endTime)) {
      return [{ breakKey: `${previous.endTime}-${slot.startTime}`, from: previous.endTime, to: slot.startTime }, slot];
    }
    return [slot];
  });

const PERIODS = [
  { key: 'morning', label: 'Morning', until: 12 * 60 },
  { key: 'afternoon', label: 'Afternoon', until: 17 * 60 },
  { key: 'evening', label: 'Evening', until: Infinity },
];

const periodOf = (time) => PERIODS.find((period) => timeToMinutes(time) < period.until);

/** Inserts a session heading whenever the part of the day changes. */
const withSessions = (items) => {
  let current = null;
  return items.flatMap((item) => {
    if (item.breakKey) return [item];
    const period = periodOf(item.startTime);
    if (period.key === current) return [item];
    current = period.key;
    return [{ sessionKey: period.key, label: period.label }, item];
  });
};

/**
 * Presentational, memoised grid. Callbacks must be stable (useCallback) for memoisation to pay off.
 * A slot is interactive only when the matching handler is supplied.
 */
function SlotGrid({ slots, selectedTime, onSelectAvailable, onSelectBooked }) {
  const items = useMemo(() => withSessions(withBreaks(slots)), [slots]);

  return (
    <div className="slot-grid" role="group" aria-label="Appointment slots">
      {items.map((item) =>
        item.sessionKey ? (
          <h3 key={`session-${item.sessionKey}`} className="slot-grid__session">
            {item.label}
          </h3>
        ) : item.breakKey ? (
          <div key={item.breakKey} className="slot-grid__break" role="separator">
            <span>
              Break · <span className="slot-grid__break-time">{formatTimeRange(item.from, item.to)}</span>
            </span>
          </div>
        ) : (
          <SlotButton
            key={item.startTime}
            slot={item}
            selected={item.startTime === selectedTime}
            onSelectAvailable={onSelectAvailable}
            onSelectBooked={onSelectBooked}
          />
        ),
      )}
    </div>
  );
}

export default memo(SlotGrid);
