import axios from 'axios';

export const isCanceled = (error) => axios.isCancel(error);

/** Normalises any thrown axios error into { message, status, fieldErrors }. */
export function extractApiError(error, fallback = 'Something went wrong. Please try again.') {
  const data = error?.response?.data;
  let message = data?.message || fallback;
  if (!error?.response && error?.request) {
    message = 'Unable to reach the server. Check your connection and try again.';
  }
  const fieldErrors = {};
  if (Array.isArray(data?.errors)) {
    data.errors.forEach(({ field, message: fieldMessage }) => {
      if (field && !fieldErrors[field]) fieldErrors[field] = fieldMessage;
    });
  }
  return { message, status: error?.response?.status, fieldErrors };
}

/**
 * Maps API field errors onto react-hook-form fields.
 * Returns true when at least one error could be attached to a known field.
 */
export function applyFieldErrors(setError, fieldErrors, fields) {
  let applied = false;
  Object.entries(fieldErrors).forEach(([field, message]) => {
    const lastSegment = field.split('.').pop();
    const target = fields.includes(field)
      ? field
      : fields.find((name) => name.split('.').pop() === lastSegment);
    if (target) {
      setError(target, { type: 'server', message });
      applied = true;
    }
  });
  return applied;
}
