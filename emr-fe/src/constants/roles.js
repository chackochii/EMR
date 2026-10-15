export const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  RECEPTIONIST: 'receptionist',
  DOCTOR: 'doctor',
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.RECEPTIONIST]: 'Receptionist',
  [ROLES.DOCTOR]: 'Doctor',
});

const ALL_ROLES = Object.values(ROLES);

/** Which roles may use each capability in the UI (the API enforces the same rules). */
export const ACCESS = Object.freeze({
  DASHBOARD: ALL_ROLES,
  SCHEDULER: ALL_ROLES,
  APPOINTMENTS: ALL_ROLES,
  BOOK: [ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST],
  MANAGE_FRONT_DESK: [ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST],
  COMPLETE_VISIT: [ROLES.SUPER_ADMIN, ROLES.DOCTOR],
  DOCTOR_SCHEDULE: [ROLES.SUPER_ADMIN],
  USERS: [ROLES.SUPER_ADMIN],
});

export const hasAccess = (role, capability) => ACCESS[capability]?.includes(role) ?? false;
