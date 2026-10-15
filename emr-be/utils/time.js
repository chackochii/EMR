const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n) => String(n).padStart(2, '0');

export const isValidTime = (value) => typeof value === 'string' && TIME_RE.test(value);

/** True for real calendar dates in YYYY-MM-DD form (rejects 2025-02-30). */
export const isValidDate = (value) => {
  const m = typeof value === 'string' && DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
};

/** 'HH:mm' -> minutes since midnight. */
export const toMinutes = (time) => {
  const [h, m] = time.split(':');
  return Number(h) * 60 + Number(m);
};

/** minutes since midnight -> 'HH:mm'. */
export const toHHmm = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** Local-time YYYY-MM-DD for a Date. */
export const formatDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const todayString = (now = new Date()) => formatDate(now);

export const minutesOfDay = (now = new Date()) => now.getHours() * 60 + now.getMinutes();

/** 0 (Sunday) - 6 (Saturday) for a YYYY-MM-DD string, evaluated in local time. */
export const dayOfWeek = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
};

/** Half-open interval overlap: [aStart, aEnd) vs [bStart, bEnd). */
export const rangesOverlap = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;
