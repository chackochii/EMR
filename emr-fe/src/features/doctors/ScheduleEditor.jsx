import { useMemo, useState } from 'react';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Select from '../../components/Select';
import { SLOT_DURATION_OPTIONS, WEEKDAYS } from '../../constants';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../hooks/useToast';
import { doctorService } from '../../services/doctorService';
import {
  flattenIssues,
  formToPayload,
  scheduleFormSchema,
  scheduleToForm,
} from '../../utils/schedule';
import SchedulePreview from './SchedulePreview';

const DURATION_OPTIONS = SLOT_DURATION_OPTIONS.map((value) => ({ value, label: `${value} minutes` }));

const replaceAt = (list, index, item) => list.map((existing, i) => (i === index ? item : existing));
const removeAt = (list, index) => list.filter((_, i) => i !== index);

function TimeRangeRow({ label, range, error, onChange, onRemove, children }) {
  return (
    <div className="range-row">
      <Input
        type="time"
        aria-label={`${label} start`}
        value={range.start}
        onChange={(event) => onChange({ ...range, start: event.target.value })}
        error={error?.start}
      />
      <span className="range-row__sep" aria-hidden="true">
        to
      </span>
      <Input
        type="time"
        aria-label={`${label} end`}
        value={range.end}
        onChange={(event) => onChange({ ...range, end: event.target.value })}
        error={error?.end}
      />
      {children}
      <Button variant="ghost" size="sm" onClick={onRemove} aria-label={`Remove ${label}`}>
        Remove
      </Button>
    </div>
  );
}

export default function ScheduleEditor({ doctorId, schedule, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(() => scheduleToForm(schedule));
  const [attempted, setAttempted] = useState(false);

  const validation = useMemo(() => scheduleFormSchema.safeParse(form), [form]);
  const errors = useMemo(() => (validation.success ? {} : flattenIssues(validation.error.issues)), [validation]);

  const { loading, run } = useAsync((payload) => doctorService.updateSchedule(doctorId, payload));

  const updateDay = (dayIndex, patch) =>
    setForm((prev) => ({ ...prev, days: replaceAt(prev.days, dayIndex, { ...prev.days[dayIndex], ...patch }) }));

  const toggleDay = (dayIndex) => {
    const day = form.days[dayIndex];
    const enabled = !day.enabled;
    updateDay(dayIndex, {
      enabled,
      sessions: enabled && day.sessions.length === 0 ? [{ start: '09:00', end: '13:00' }] : day.sessions,
    });
  };

  const addSession = (dayIndex) => {
    const { sessions } = form.days[dayIndex];
    const last = sessions[sessions.length - 1];
    updateDay(dayIndex, {
      sessions: [...sessions, last ? { start: last.end, end: '18:00' } : { start: '09:00', end: '13:00' }],
    });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setAttempted(true);
    if (!validation.success) {
      toast.error('Fix the highlighted schedule errors first.');
      return;
    }
    try {
      await run(formToPayload(validation.data));
      toast.success('Schedule saved');
      onSaved();
    } catch (apiError) {
      toast.error(apiError.message);
    }
  };

  return (
    <form onSubmit={handleSave} noValidate className="stack">
      <section className="card">
        <h2 className="card__title">Working days and sessions</h2>
        {attempted && errors.days && (
          <p className="field__error" role="alert">
            {errors.days}
          </p>
        )}
        <ul className="day-list">
          {form.days.map((day, dayIndex) => {
            const weekday = WEEKDAYS.find((item) => item.value === day.dayOfWeek);
            return (
              <li key={day.dayOfWeek} className={`day-row ${day.enabled ? 'day-row--on' : ''}`}>
                <label className="checkbox day-row__toggle">
                  <input type="checkbox" checked={day.enabled} onChange={() => toggleDay(dayIndex)} />
                  <span>{weekday.label}</span>
                </label>
                {day.enabled ? (
                  <div className="day-row__sessions">
                    {day.sessions.map((session, sessionIndex) => (
                      <TimeRangeRow
                        key={sessionIndex}
                        label={`${weekday.label} session ${sessionIndex + 1}`}
                        range={session}
                        error={{
                          start: errors[`days.${dayIndex}.sessions.${sessionIndex}.start`],
                          end: errors[`days.${dayIndex}.sessions.${sessionIndex}.end`],
                        }}
                        onChange={(next) =>
                          updateDay(dayIndex, { sessions: replaceAt(day.sessions, sessionIndex, next) })
                        }
                        onRemove={() => updateDay(dayIndex, { sessions: removeAt(day.sessions, sessionIndex) })}
                      />
                    ))}
                    {errors[`days.${dayIndex}.sessions`] && (
                      <p className="field__error" role="alert">
                        {errors[`days.${dayIndex}.sessions`]}
                      </p>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => addSession(dayIndex)}>
                      + Add session
                    </Button>
                  </div>
                ) : (
                  <p className="day-row__off">Not working</p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card">
        <h2 className="card__title">Slot duration and breaks</h2>
        <div className="form-grid">
          <Select
            label="Slot duration"
            options={DURATION_OPTIONS}
            value={form.slotDuration}
            error={errors.slotDuration}
            onChange={(event) => setForm((prev) => ({ ...prev, slotDuration: Number(event.target.value) }))}
          />
        </div>
        <h3 className="details__heading">Breaks</h3>
        <div className="stack stack--sm">
          {form.breaks.length === 0 && <p className="hint">No breaks. Breaks apply to every working day.</p>}
          {form.breaks.map((item, index) => (
            <TimeRangeRow
              key={index}
              label={`Break ${index + 1}`}
              range={item}
              error={{
                start: errors[`breaks.${index}.start`],
                end: errors[`breaks.${index}.end`],
              }}
              onChange={(next) => setForm((prev) => ({ ...prev, breaks: replaceAt(prev.breaks, index, next) }))}
              onRemove={() => setForm((prev) => ({ ...prev, breaks: removeAt(prev.breaks, index) }))}
            >
              <Input
                aria-label={`Break ${index + 1} label`}
                placeholder="Label (e.g. Lunch)"
                value={item.label}
                maxLength={40}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, breaks: replaceAt(prev.breaks, index, { ...item, label: event.target.value }) }))
                }
                error={errors[`breaks.${index}.label`]}
              />
            </TimeRangeRow>
          ))}
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setForm((prev) => ({ ...prev, breaks: [...prev.breaks, { start: '13:00', end: '14:00', label: 'Lunch' }] }))
              }
            >
              + Add break
            </Button>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="card__title">Preview</h2>
        <SchedulePreview form={form} />
      </section>

      <div className="form-actions">
        <Button type="submit" loading={loading}>
          Save schedule
        </Button>
      </div>
    </form>
  );
}
