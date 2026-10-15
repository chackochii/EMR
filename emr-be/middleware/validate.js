import { AppError } from '../utils/AppError.js';

const PARTS = ['params', 'query', 'body'];

const fieldOf = (part, issue) => {
  const path = issue.code === 'unrecognized_keys' ? issue.keys.join(',') : issue.path.join('.');
  return path || part;
};

/** Drops empty-string query params (`?status=`) so optional filters behave as "not provided". */
const stripEmpty = (query) =>
  Object.fromEntries(Object.entries(query).filter(([, value]) => value !== ''));

/**
 * Validates req.params / req.query / req.body with zod schemas and replaces them with parsed values.
 * Failures produce a 422 with per-field errors.
 * @param {{params?: import('zod').ZodTypeAny, query?: import('zod').ZodTypeAny, body?: import('zod').ZodTypeAny}} schemas
 */
export const validate = (schemas) => (req, res, next) => {
  const errors = [];
  for (const part of PARTS) {
    if (!schemas[part]) continue;
    const input = part === 'query' ? stripEmpty(req.query) : req[part] ?? {};
    const result = schemas[part].safeParse(input);
    if (result.success) {
      req[part] = result.data;
    } else {
      errors.push(...result.error.issues.map((i) => ({ field: fieldOf(part, i), message: i.message })));
    }
  }
  if (errors.length) throw new AppError('Validation failed', 422, errors);
  next();
};
