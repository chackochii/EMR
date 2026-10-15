import { z } from 'zod';
import { isValidDate, isValidTime } from './time.js';

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
export const dateString = z.string().refine(isValidDate, 'Must be a valid date in YYYY-MM-DD format');
export const timeString = z.string().refine(isValidTime, 'Must be a time in HH:mm (24h) format');

export const paginationQuery = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
};
