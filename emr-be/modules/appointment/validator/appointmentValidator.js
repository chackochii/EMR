import { z } from 'zod';
import { APPOINTMENT_STATUS, APPOINTMENT_STATUS_VALUES } from '../../../utils/constants.js';
import { dateString, objectId, paginationQuery, timeString } from '../../../utils/validation.js';
import { patientInput } from '../../patient/validator/patientValidator.js';

const purpose = z.string().trim().min(1).max(500);
const notes = z.string().trim().max(2000);

export const appointmentIdParams = z.object({ id: objectId });

export const createAppointmentBody = z
  .object({
    doctorId: objectId,
    date: dateString,
    startTime: timeString,
    purpose,
    notes: notes.optional(),
    patientId: z.string().trim().min(1).max(30).optional(),
    newPatient: patientInput.optional(),
  })
  .strict()
  .refine((b) => Boolean(b.patientId) !== Boolean(b.newPatient), {
    message: 'Provide either patientId or newPatient',
    path: ['patientId'],
  });

export const updateAppointmentBody = z
  .object({
    purpose: purpose.optional(),
    notes: notes.optional(),
    status: z.literal(APPOINTMENT_STATUS.COMPLETED).optional(),
  })
  .strict()
  .refine((b) => Object.keys(b).length > 0, { message: 'Provide at least one field to update' });

export const cancelAppointmentBody = z.object({ reason: z.string().trim().max(500).optional() }).strict();

export const listAppointmentsQuery = z
  .object({
    ...paginationQuery,
    sortBy: z.enum(['date', 'startTime', 'createdAt', 'status']).default('date'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    patient: z.string().trim().max(100).optional(),
    doctor: z.string().trim().max(100).optional(),
    mobile: z.string().trim().max(20).optional(),
    departmentId: objectId.optional(),
    doctorId: objectId.optional(),
    status: z.enum(APPOINTMENT_STATUS_VALUES).optional(),
    dateFrom: dateString.optional(),
    dateTo: dateString.optional(),
  })
  .refine((q) => !q.dateFrom || !q.dateTo || q.dateFrom <= q.dateTo, {
    message: 'dateFrom must not be after dateTo',
    path: ['dateFrom'],
  });
