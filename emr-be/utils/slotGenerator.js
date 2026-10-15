import { dayOfWeek, minutesOfDay, rangesOverlap, toHHmm, toMinutes, todayString } from './time.js';

/** Human label for a session, derived from its start time. */
export const sessionLabel = (startMinute) => {
  if (startMinute < 12 * 60) return 'Morning';
  if (startMinute < 17 * 60) return 'Afternoon';
  return 'Evening';
};

/**
 * Pure slot generator.
 * Slots are generated per session in `slotDuration` steps; a slot is emitted only when it fits
 * entirely inside the session and does not overlap any break (breaks apply to every working day).
 *
 * @param {{slotDuration:number, workingDays:{dayOfWeek:number,sessions:{start:string,end:string}[]}[], breaks?:{start:string,end:string}[]}} schedule
 * @param {string} date YYYY-MM-DD
 * @param {Date} [now] injectable clock (server local time)
 * @returns {{isWorkingDay:boolean, slots:{startTime:string,endTime:string,session:string,sessionIndex:number,past:boolean}[]}}
 */
export function generateSlots(schedule, date, now = new Date()) {
  const { slotDuration, workingDays = [], breaks = [] } = schedule;
  const day = workingDays.find((d) => d.dayOfWeek === dayOfWeek(date));
  if (!day || day.sessions.length === 0) return { isWorkingDay: false, slots: [] };

  const breakRanges = breaks.map((b) => [toMinutes(b.start), toMinutes(b.end)]);
  const today = todayString(now);
  const nowMinute = minutesOfDay(now);
  const sessions = day.sessions
    .map((s) => [toMinutes(s.start), toMinutes(s.end)])
    .sort((a, b) => a[0] - b[0]);

  const slots = [];
  sessions.forEach(([sessionStart, sessionEnd], sessionIndex) => {
    for (let start = sessionStart; start + slotDuration <= sessionEnd; start += slotDuration) {
      const end = start + slotDuration;
      if (breakRanges.some(([bs, be]) => rangesOverlap(start, end, bs, be))) continue;
      slots.push({
        startTime: toHHmm(start),
        endTime: toHHmm(end),
        session: sessionLabel(sessionStart),
        sessionIndex,
        past: date < today || (date === today && start <= nowMinute),
      });
    }
  });
  return { isWorkingDay: true, slots };
}
