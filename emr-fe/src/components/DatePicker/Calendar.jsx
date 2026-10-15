import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../Icon';
import { WEEKDAYS } from '../../constants';
import { addDaysISO, addMonthsISO, parseISODate, todayISO, toISODate } from '../../utils/date';

const clamp = (iso, min, max) => {
  if (min && iso < min) return min;
  if (max && iso > max) return max;
  return iso;
};

const buildMonthGrid = (cursorISO) => {
  const cursor = parseISODate(cursorISO);
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const date = new Date(start);
      date.setDate(start.getDate() + week * 7 + day);
      return { iso: toISODate(date), day: date.getDate(), inMonth: date.getMonth() === cursor.getMonth() };
    }),
  );
};

const KEY_STEPS = {
  ArrowLeft: (iso) => addDaysISO(iso, -1),
  ArrowRight: (iso) => addDaysISO(iso, 1),
  ArrowUp: (iso) => addDaysISO(iso, -7),
  ArrowDown: (iso) => addDaysISO(iso, 7),
  PageUp: (iso) => addMonthsISO(iso, -1),
  PageDown: (iso) => addMonthsISO(iso, 1),
};

/** Accessible month grid: arrow keys move by day/week, PageUp/PageDown by month, Enter/Space selects. */
export default function Calendar({ value, min, max, onSelect }) {
  const [cursor, setCursor] = useState(() => clamp(value || todayISO(), min, max));
  const gridRef = useRef(null);
  const focusPending = useRef(true);
  const today = todayISO();
  const weeks = useMemo(() => buildMonthGrid(cursor), [cursor]);

  useEffect(() => {
    if (focusPending.current) {
      focusPending.current = false;
      gridRef.current?.querySelector(`[data-date="${cursor}"]`)?.focus();
    }
  }, [cursor]);

  const moveCursor = (next) => {
    focusPending.current = true;
    setCursor(clamp(next, min, max));
  };

  const handleKeyDown = (event) => {
    const step = KEY_STEPS[event.key];
    if (step) {
      event.preventDefault();
      moveCursor(step(cursor));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      moveCursor(addDaysISO(cursor, event.key === 'Home' ? -parseISODate(cursor).getDay() : 6 - parseISODate(cursor).getDay()));
    }
  };

  const monthLabel = parseISODate(cursor).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const prevDisabled = Boolean(min) && addMonthsISO(cursor, -1).slice(0, 7) < min.slice(0, 7);
  const nextDisabled = Boolean(max) && addMonthsISO(cursor, 1).slice(0, 7) > max.slice(0, 7);

  return (
    <div className="calendar">
      <div className="calendar__header">
        <button
          type="button"
          className="calendar__nav"
          onClick={() => setCursor(addMonthsISO(cursor, -1))}
          disabled={prevDisabled}
          aria-label="Previous month"
        >
          <Icon name="chevron-down" size={16} className="icon--rot-90" />
        </button>
        <span className="calendar__title" aria-live="polite">
          {monthLabel}
        </span>
        <button
          type="button"
          className="calendar__nav"
          onClick={() => setCursor(addMonthsISO(cursor, 1))}
          disabled={nextDisabled}
          aria-label="Next month"
        >
          <Icon name="chevron-down" size={16} className="icon--rot-neg-90" />
        </button>
      </div>
      <table className="calendar__grid" role="grid" aria-label={monthLabel} ref={gridRef} onKeyDown={handleKeyDown}>
        <thead>
          <tr>
            {WEEKDAYS.map((weekday) => (
              <th key={weekday.value} scope="col" abbr={weekday.label}>
                {weekday.short.slice(0, 2)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0].iso}>
              {week.map(({ iso, day, inMonth }) => {
                const disabled = (min && iso < min) || (max && iso > max);
                const selected = iso === value;
                const classes = ['calendar__day'];
                if (!inMonth) classes.push('calendar__day--outside');
                if (iso === today) classes.push('calendar__day--today');
                if (selected) classes.push('calendar__day--selected');
                return (
                  <td key={iso} role="gridcell" aria-selected={selected}>
                    <button
                      type="button"
                      data-date={iso}
                      className={classes.join(' ')}
                      tabIndex={iso === cursor ? 0 : -1}
                      disabled={disabled}
                      onClick={() => onSelect(iso)}
                      aria-label={parseISODate(iso).toLocaleDateString('en-GB', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      aria-current={iso === today ? 'date' : undefined}
                    >
                      {day}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
