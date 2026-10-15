import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateSlots } from '../../utils/slotGenerator.js';
import { scheduleBody } from '../../modules/doctor/validator/doctorValidator.js';
import { toHHmm, toMinutes } from '../../utils/time.js';

// 2030-01-07 is a Monday (dayOfWeek 1).
const MONDAY = '2030-01-07';
const SUNDAY = '2030-01-06';
const NOW = new Date(2030, 0, 7, 10, 0); // Monday 10:00 local

const schedule = (overrides = {}) => ({
  slotDuration: 15,
  workingDays: [{ dayOfWeek: 1, sessions: [{ start: '09:00', end: '10:00' }] }],
  breaks: [],
  ...overrides,
});

const starts = (result) => result.slots.map((s) => s.startTime);

describe('generateSlots', () => {
  it('09:00-10:00 at 15 minutes gives 4 slots', () => {
    const result = generateSlots(schedule(), MONDAY, new Date(2030, 0, 1));
    assert.deepEqual(starts(result), ['09:00', '09:15', '09:30', '09:45']);
    assert.equal(result.slots[3].endTime, '10:00');
    assert.equal(result.isWorkingDay, true);
  });

  it('returns no slots on a non-working day', () => {
    const result = generateSlots(schedule(), SUNDAY, NOW);
    assert.deepEqual(result, { isWorkingDay: false, slots: [] });
  });

  it('only emits slots that fit completely inside the session', () => {
    const result = generateSlots(
      schedule({ slotDuration: 25, workingDays: [{ dayOfWeek: 1, sessions: [{ start: '09:00', end: '10:00' }] }] }),
      MONDAY,
      new Date(2030, 0, 1),
    );
    assert.deepEqual(starts(result), ['09:00', '09:25']); // 09:50-10:15 would overflow
  });

  it('excludes slots overlapping a break, including partial overlaps', () => {
    const result = generateSlots(
      schedule({
        slotDuration: 30,
        workingDays: [{ dayOfWeek: 1, sessions: [{ start: '09:00', end: '12:00' }] }],
        breaks: [{ start: '10:15', end: '10:45' }],
      }),
      MONDAY,
      new Date(2030, 0, 1),
    );
    assert.deepEqual(starts(result), ['09:00', '09:30', '11:00', '11:30']);
  });

  it('never overlaps a break and never overlaps other slots (property check)', () => {
    const sched = schedule({
      slotDuration: 20,
      workingDays: [
        {
          dayOfWeek: 1,
          sessions: [
            { start: '13:00', end: '17:00' },
            { start: '08:30', end: '12:30' },
          ],
        },
      ],
      breaks: [{ start: '10:00', end: '10:20' }, { start: '15:05', end: '15:35' }],
    });
    const { slots } = generateSlots(sched, MONDAY, new Date(2030, 0, 1));
    assert.ok(slots.length > 0);
    for (const slot of slots) {
      for (const b of sched.breaks) {
        const overlaps = toMinutes(slot.startTime) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(slot.endTime);
        assert.equal(overlaps, false, `${slot.startTime} overlaps break ${b.start}`);
      }
    }
    for (let i = 1; i < slots.length; i += 1) {
      assert.ok(toMinutes(slots[i].startTime) >= toMinutes(slots[i - 1].endTime), 'slots overlap or are unordered');
    }
  });

  it('works with the seeded Morning/Evening + lunch layout', () => {
    const { slots } = generateSlots(
      schedule({
        slotDuration: 30,
        workingDays: [
          { dayOfWeek: 1, sessions: [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
        ],
        breaks: [{ start: '12:00', end: '13:00' }],
      }),
      MONDAY,
      new Date(2030, 0, 1),
    );
    assert.equal(slots.length, 6 + 8);
    assert.ok(!slots.some((s) => s.startTime === '12:00' || s.startTime === '12:30'));
    assert.deepEqual([...new Set(slots.map((s) => s.session))], ['Morning', 'Afternoon']);
  });

  describe('past flag', () => {
    it('marks every slot of a past date as past', () => {
      const { slots } = generateSlots(schedule(), MONDAY, new Date(2030, 0, 8, 6, 0));
      assert.ok(slots.every((s) => s.past));
    });

    it('marks no slot of a future date as past', () => {
      const { slots } = generateSlots(schedule(), MONDAY, new Date(2030, 0, 6, 23, 59));
      assert.ok(slots.every((s) => !s.past));
    });

    it('marks only already-started slots as past today', () => {
      const { slots } = generateSlots(schedule(), MONDAY, new Date(2030, 0, 7, 9, 20));
      assert.deepEqual(
        slots.map((s) => [s.startTime, s.past]),
        [['09:00', true], ['09:15', true], ['09:30', false], ['09:45', false]],
      );
    });
  });
});

describe('time helpers', () => {
  it('round-trips minutes and HH:mm', () => {
    assert.equal(toMinutes('09:05'), 545);
    assert.equal(toHHmm(545), '09:05');
  });
});

describe('scheduleBody validation', () => {
  const base = { slotDuration: 15, workingDays: [], breaks: [] };
  const check = (body) => scheduleBody.safeParse({ ...base, ...body });

  it('accepts a valid schedule', () => {
    assert.equal(check({ workingDays: [{ dayOfWeek: 1, sessions: [{ start: '09:00', end: '12:00' }] }] }).success, true);
  });
  it('rejects start >= end', () => {
    assert.equal(check({ workingDays: [{ dayOfWeek: 1, sessions: [{ start: '12:00', end: '09:00' }] }] }).success, false);
  });
  it('rejects overlapping sessions in a day', () => {
    const sessions = [{ start: '09:00', end: '12:00' }, { start: '11:00', end: '14:00' }];
    assert.equal(check({ workingDays: [{ dayOfWeek: 1, sessions }] }).success, false);
  });
  it('rejects duplicate days and sessions shorter than the slot', () => {
    assert.equal(check({ workingDays: [{ dayOfWeek: 1, sessions: [] }, { dayOfWeek: 1, sessions: [] }] }).success, false);
    assert.equal(check({ workingDays: [{ dayOfWeek: 1, sessions: [{ start: '09:00', end: '09:10' }] }] }).success, false);
  });
  it('rejects invalid slot duration and breaks', () => {
    assert.equal(check({ slotDuration: 3 }).success, false);
    assert.equal(check({ breaks: [{ start: '13:00', end: '12:00' }] }).success, false);
  });
});
