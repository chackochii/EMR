import { useMemo, useState } from 'react';
import Select from '../../components/Select';
import { WEEKDAYS } from '../../constants';
import { formatTime } from '../../utils/date';
import { generateSlots } from '../../utils/schedule';

/** Live approximation of the slots the server will generate for a chosen weekday. */
export default function SchedulePreview({ form }) {
  const enabledDays = form.days.filter((day) => day.enabled);
  const [previewDay, setPreviewDay] = useState(null);
  const activeDay = enabledDays.find((day) => day.dayOfWeek === previewDay) || enabledDays[0];

  const slots = useMemo(
    () => (activeDay ? generateSlots(activeDay, form.slotDuration, form.breaks) : []),
    [activeDay, form.slotDuration, form.breaks],
  );

  if (!activeDay) {
    return <p className="hint">Enable a working day to preview its slots.</p>;
  }

  return (
    <div className="schedule-preview">
      <div className="schedule-preview__head">
        <Select
          label="Preview day"
          value={activeDay.dayOfWeek}
          options={enabledDays.map((day) => ({
            value: day.dayOfWeek,
            label: WEEKDAYS.find((weekday) => weekday.value === day.dayOfWeek).label,
          }))}
          onChange={(event) => setPreviewDay(Number(event.target.value))}
        />
        <p className="schedule-preview__count">
          <strong>{slots.length}</strong> slots
        </p>
      </div>
      {slots.length === 0 ? (
        <p className="hint">No slots fit the current sessions and slot duration.</p>
      ) : (
        <ul className="chip-list" aria-label="Generated slots">
          {slots.map((time) => (
            <li key={time} className="chip">
              {formatTime(time)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
