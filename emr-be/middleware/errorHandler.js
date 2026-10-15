import { logger } from '../config/logger.js';
import { AppError } from '../utils/AppError.js';

const JWT_ERRORS = new Set(['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError']);

/** Maps any thrown error to `{status, message, errors?}` without leaking internals. */
const normalize = (err) => {
  if (err instanceof AppError) return { status: err.statusCode, message: err.message, errors: err.errors };

  if (err.name === 'ValidationError' && err.errors) {
    const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return { status: 422, message: 'Validation failed', errors };
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern ?? {})[0] ?? 'value';
    return { status: 409, message: `Duplicate value: ${field} already exists`, errors: [{ field, message: 'Already exists' }] };
  }
  if (err.name === 'CastError') return { status: 400, message: `Invalid value for ${err.path}` };
  if (JWT_ERRORS.has(err.name)) return { status: 401, message: 'Invalid or expired token' };
  if (err.type === 'entity.parse.failed') return { status: 400, message: 'Malformed JSON body' };
  if (err.type === 'entity.too.large') return { status: 413, message: 'Request body too large' };

  return { status: 500, message: 'Internal server error' };
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const { status, message, errors } = normalize(err);
  if (status >= 500) logger.error({ err, path: req.originalUrl }, 'Unhandled error');
  const body = { success: false, message };
  if (errors?.length) body.errors = errors;
  res.status(status).json(body);
};
