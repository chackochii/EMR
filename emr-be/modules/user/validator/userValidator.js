import { z } from 'zod';
import { ROLES } from '../../../utils/constants.js';
import { objectId, paginationQuery } from '../../../utils/validation.js';

export const createUserBody = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().toLowerCase().email().max(254),
    password: z
      .string()
      .min(8)
      .max(100)
      .regex(/[A-Za-z]/, 'Must contain a letter')
      .regex(/\d/, 'Must contain a digit'),
    role: z.enum([ROLES.DOCTOR, ROLES.RECEPTIONIST]),
    mobile: z.string().trim().regex(/^\+?\d{7,15}$/, 'Invalid mobile number').optional(),
    departmentId: objectId.optional(),
    specialization: z.string().trim().max(100).optional(),
  })
  .strict()
  .refine((u) => u.role !== ROLES.DOCTOR || u.departmentId, {
    message: 'departmentId is required for doctors',
    path: ['departmentId'],
  });

export const listUsersQuery = z.object({
  ...paginationQuery,
  role: z.enum([ROLES.SUPER_ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST]).optional(),
});
