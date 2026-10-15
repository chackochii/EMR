export const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  RECEPTIONIST: 'receptionist',
  DOCTOR: 'doctor',
});
export const ROLE_VALUES = Object.values(ROLES);

export const APPOINTMENT_STATUS = Object.freeze({
  SCHEDULED: 'scheduled',
  ARRIVED: 'arrived',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});
export const APPOINTMENT_STATUS_VALUES = Object.values(APPOINTMENT_STATUS);

/** Statuses that occupy a slot (cancelled frees it). Used by the unique partial index. */
export const SLOT_HOLDING_STATUSES = [
  APPOINTMENT_STATUS.SCHEDULED,
  APPOINTMENT_STATUS.ARRIVED,
  APPOINTMENT_STATUS.COMPLETED,
];

/** Statuses in which receptionist/admin may still edit purpose/notes. */
export const EDITABLE_STATUSES = [APPOINTMENT_STATUS.SCHEDULED, APPOINTMENT_STATUS.ARRIVED];

/** Allowed status workflow: from -> [to...]. */
export const STATUS_TRANSITIONS = Object.freeze({
  [APPOINTMENT_STATUS.SCHEDULED]: [APPOINTMENT_STATUS.ARRIVED, APPOINTMENT_STATUS.CANCELLED],
  [APPOINTMENT_STATUS.ARRIVED]: [APPOINTMENT_STATUS.COMPLETED],
  [APPOINTMENT_STATUS.COMPLETED]: [],
  [APPOINTMENT_STATUS.CANCELLED]: [],
});

export const canTransition = (from, to) => (STATUS_TRANSITIONS[from] ?? []).includes(to);

export const SLOT_STATUS = Object.freeze({ AVAILABLE: 'available', BOOKED: 'booked', PAST: 'past' });

export const AUDIT_ACTIONS = Object.freeze({
  LOGIN: 'LOGIN',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  USER_CREATED: 'USER_CREATED',
  SCHEDULE_UPDATED: 'SCHEDULE_UPDATED',
  APPOINTMENT_CREATED: 'APPOINTMENT_CREATED',
  APPOINTMENT_UPDATED: 'APPOINTMENT_UPDATED',
  APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
  APPOINTMENT_ARRIVED: 'APPOINTMENT_ARRIVED',
  APPOINTMENT_COMPLETED: 'APPOINTMENT_COMPLETED',
});
export const AUDIT_ACTION_VALUES = Object.values(AUDIT_ACTIONS);

export const SOCKET_EVENTS = Object.freeze({
  SUBSCRIBE: 'scheduler:subscribe',
  UNSUBSCRIBE: 'scheduler:unsubscribe',
  APPOINTMENT_CREATED: 'appointment:created',
  APPOINTMENT_UPDATED: 'appointment:updated',
  APPOINTMENT_CANCELLED: 'appointment:cancelled',
});

export const ALL_APPOINTMENTS_ROOM = 'all-appointments';
export const doctorRoom = (doctorId) => `doctor:${doctorId}`;
