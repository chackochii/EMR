export const capitalize = (value) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : '');

export const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

export const formatPatientAge = (patient) => {
  if (patient?.age != null) return `${patient.age} yrs`;
  if (patient?.dateOfBirth) {
    const diff = Date.now() - new Date(patient.dateOfBirth).getTime();
    return `${Math.floor(diff / (365.25 * 24 * 3600 * 1000))} yrs`;
  }
  return '—';
};

/** Drops empty-string / null / undefined values so optional fields are not sent as "". */
export const compactObject = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== '' && value != null));

/** Stable colour bucket (t0-t5) derived from a name, so a person always gets the same avatar colour. */
export const avatarTone = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 997;
  return `t${hash % 6}`;
};
