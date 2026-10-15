import { z } from 'zod';
import { objectId, timeString } from '../../../utils/validation.js';
import { rangesOverlap, toMinutes } from '../../../utils/time.js';

export const doctorIdParams = z.object({ id: objectId });

export const listDoctorsQuery = z.object({
  departmentId: objectId.optional(),
  search: z.string().trim().max(100).optional(),
});

const range = z.object({ start: timeString, end: timeString }).strict();
const startBeforeEnd = (r) => toMinutes(r.start) < toMinutes(r.end);
const rangeError = { message: 'start must be before end', path: ['end'] };

const sessionSchema = range.refine(startBeforeEnd, rangeError);
const breakSchema = z
  .object({ start: timeString, end: timeString, label: z.string().trim().max(50).optional() })
  .strict()
  .refine(startBeforeEnd, rangeError);

const workingDaySchema = z
  .object({ dayOfWeek: z.number().int().min(0).max(6), sessions: z.array(sessionSchema).max(6) })
  .strict();

/** Cross-field rules: unique days, non-overlapping sessions, every session fits at least one slot. */
export const scheduleBody = z
  .object({
    slotDuration: z.number().int().min(5).max(120),
    workingDays: z.array(workingDaySchema).max(7),
    breaks: z.array(breakSchema).max(10),
  })
  .strict()
  .superRefine((schedule, ctx) => {
    const issue = (path, message) => ctx.addIssue({ code: 'custom', path, message });

    const seenDays = new Set();
    schedule.workingDays.forEach((day, di) => {
      if (seenDays.has(day.dayOfWeek)) issue(['workingDays', di, 'dayOfWeek'], 'Duplicate dayOfWeek');
      seenDays.add(day.dayOfWeek);

      const sorted = day.sessions
        .map((s, si) => ({ start: toMinutes(s.start), end: toMinutes(s.end), si }))
        .sort((a, b) => a.start - b.start);
      sorted.forEach((s, i) => {
        if (s.end - s.start < schedule.slotDuration) {
          issue(['workingDays', di, 'sessions', s.si], 'Session is shorter than the slot duration');
        }
        const prev = sorted[i - 1];
        if (prev && rangesOverlap(prev.start, prev.end, s.start, s.end)) {
          issue(['workingDays', di, 'sessions', s.si], 'Sessions must not overlap');
        }
      });
    });
  });
