import { memo, useMemo } from 'react';
import Icon from '../../components/Icon';
import { SLOT_STATUS } from '../../constants/statuses';

/** Legend doubling as live counts of available / booked / past slots. */
function SlotSummary({ slots }) {
  const counts = useMemo(
    () =>
      slots.reduce(
        (acc, slot) => ({ ...acc, [slot.status]: (acc[slot.status] || 0) + 1 }),
        { [SLOT_STATUS.AVAILABLE]: 0, [SLOT_STATUS.BOOKED]: 0, [SLOT_STATUS.PAST]: 0 },
      ),
    [slots],
  );

  return (
    <ul className="slot-summary" aria-label="Slot legend">
      <li>
        <span className="slot-summary__swatch slot-summary__swatch--available" aria-hidden="true" />
        Available <strong>{counts.available}</strong>
      </li>
      <li>
        <span className="slot-summary__swatch slot-summary__swatch--booked" aria-hidden="true">
          <Icon name="lock" size={11} strokeWidth={2.4} />
        </span>
        Booked <strong>{counts.booked}</strong>
      </li>
      <li>
        <span className="slot-summary__swatch slot-summary__swatch--past" aria-hidden="true" />
        Past <strong>{counts.past}</strong>
      </li>
    </ul>
  );
}

export default memo(SlotSummary);
