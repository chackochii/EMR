import { z } from 'zod';
import { MOBILE_REGEX } from '../../constants';

const visitFields = {
  purpose: z.string().trim().min(3, 'Enter the purpose of the visit').max(200, 'Keep the purpose under 200 characters'),
  notes: z.string().trim().max(1000, 'Keep notes under 1000 characters').optional(),
};

export const mobileSchema = z.string().trim().regex(MOBILE_REGEX, 'Enter a valid 10-digit mobile number');

const newPatientSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter the patient name').max(100, 'Name is too long'),
    mobile: mobileSchema,
    gender: z.enum(['male', 'female', 'other'], { errorMap: () => ({ message: 'Select a gender' }) }),
    age: z
      .string()
      .trim()
      .refine((v) => v === '' || (/^\d{1,3}$/.test(v) && Number(v) <= 120), 'Enter an age between 0 and 120'),
    dateOfBirth: z.string(),
    email: z.string().trim().email('Enter a valid email address').or(z.literal('')),
  })
  .refine((patient) => patient.age !== '' || patient.dateOfBirth !== '', {
    message: 'Enter an age or a date of birth',
    path: ['age'],
  });

export const existingPatientBookingSchema = z.object(visitFields);

export const newPatientBookingSchema = z.object({ ...visitFields, newPatient: newPatientSchema });

export const BOOKING_FORM_FIELDS = [
  'purpose',
  'notes',
  'newPatient.name',
  'newPatient.mobile',
  'newPatient.gender',
  'newPatient.age',
  'newPatient.dateOfBirth',
  'newPatient.email',
];
