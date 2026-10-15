import { z } from 'zod';
import { todayString } from '../../../utils/time.js';
import { dateString, objectId } from '../../../utils/validation.js';

const mobile = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^\+?\d{7,15}$/, 'Invalid mobile number'));

/** Shared by POST /patients and appointment `newPatient`. */
export const patientInput = z
  .object({
    name: z.string().trim().min(2).max(100),
    mobile,
    gender: z.enum(['male', 'female', 'other']),
    age: z.number().int().min(0).max(150).optional(),
    dateOfBirth: dateString.optional(),
    email: z.string().trim().toLowerCase().email().max(254).optional(),
    address: z.string().trim().max(300).optional(),
  })
  .strict()
  .refine((p) => !p.dateOfBirth || p.dateOfBirth <= todayString(), {
    message: 'dateOfBirth cannot be in the future',
    path: ['dateOfBirth'],
  });

export const patientIdParams = z.object({ id: objectId });

export const searchPatientsQuery = z.object({
  search: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
