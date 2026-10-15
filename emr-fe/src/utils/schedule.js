import { z } from 'zod';
import { SLOT_DURATION_OPTIONS, WEEKDAYS } from '../constants';
import { minutesToTime, timeToMinutes } from './date';

const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Enter a valid time');

const timeRange = z
  .object({ start: timeString, end: timeString })
  .refine((range) => range.start < range.end, { message: 'End must be after start', path: ['end'] });

const addOverlapIssues = (ranges, ctx, pathPrefix, message) => {
  const sorted = ranges
    .map((range, index) => ({ ...range, index }))
    .sort((a, b) => a.start.localeCompare(b.start));
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].start < sorted[i - 1].end) {
      ctx.addIssue({ code: 'custom', message, path: [...pathPrefix, sorted[i].index, 'start'] });
    }
  }
};

const dayShape = z
  .object({ dayOfWeek: z.number(), enabled: z.boolean(), sessions: z.array(timeRange) })
  .superRefine((day, ctx) => {
    if (!day.enabled) return;
    if (day.sessions.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'Add at least one session', path: ['sessions'] });
    }
    addOverlapIssues(day.sessions, ctx, ['sessions'], 'Overlaps another session');
  });

const breakShape = z
  .object({ start: timeString, end: timeString, label: z.string().max(40, 'Max 40 characters') })
  .refine((item) => item.start < item.end, { message: 'End must be after start', path: ['end'] });

export const scheduleFormSchema = z
  .object({
    slotDuration: z.number().refine((v) => SLOT_DURATION_OPTIONS.includes(v), 'Choose a slot duration'),
    days: z.array(dayShape),
    breaks: z.array(breakShape),
  })
  .superRefine((form, ctx) => {
    if (!form.days.some((day) => day.enabled)) {
      ctx.addIssue({ code: 'custom', message: 'Select at least one working day', path: ['days'] });
    }
    addOverlapIssues(form.breaks, ctx, ['breaks'], 'Overlaps another break');
  });

/** Turns zod issues into a flat { 'days.1.sessions.0.end': message } map. */
export const flattenIssues = (issues) =>
  issues.reduce((acc, issue) => {
    const key = issue.path.join('.');
    if (!acc[key]) acc[key] = issue.message;
    return acc;
  }, {});

export const createEmptyScheduleForm = () => ({
  slotDuration: 15,
  days: WEEKDAYS.map(({ value }) => ({ dayOfWeek: value, enabled: false, sessions: [] })),
  breaks: [],
});

export const scheduleToForm = (schedule) => {
  const form = createEmptyScheduleForm();
  if (!schedule) return form;
  form.slotDuration = schedule.slotDuration || 15;
  (schedule.workingDays || []).forEach(({ dayOfWeek, sessions }) => {
    const day = form.days.find((d) => d.dayOfWeek === dayOfWeek);
    if (day) {
      day.enabled = true;
      day.sessions = sessions.map(({ start, end }) => ({ start, end }));
    }
  });
  form.breaks = (schedule.breaks || []).map(({ start, end, label }) => ({
    start,
    end,
    label: label || '',
  }));
  return form;
};

export const formToPayload = (form) => ({
  slotDuration: form.slotDuration,
  workingDays: form.days
    .filter((day) => day.enabled)
    .map(({ dayOfWeek, sessions }) => ({ dayOfWeek, sessions })),
  breaks: form.breaks.map(({ start, end, label }) => (label ? { start, end, label } : { start, end })),
});

/** Approximation of the slots the server will generate for one working day. */
export function generateSlots(day, slotDuration, breaks) {
  if (!day?.enabled) return [];
  const slots = [];
  day.sessions.forEach(({ start, end }) => {
    if (!start || !end) return;
    const sessionEnd = timeToMinutes(end);
    for (let t = timeToMinutes(start); t + slotDuration <= sessionEnd; t += slotDuration) {
      const blocked = breaks.some(
        (b) => b.start && b.end && t < timeToMinutes(b.end) && t + slotDuration > timeToMinutes(b.start),
      );
      if (!blocked) slots.push(minutesToTime(t));
    }
  });
  return slots;
}
