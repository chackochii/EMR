import mongoose from 'mongoose';
import { ROLES } from '../../../utils/constants.js';
import { AppError } from '../../../utils/AppError.js';
import { escapeRegex } from '../../../utils/regex.js';
import { Appointment } from '../../appointment/model/Appointment.js';
import { Counter } from '../model/Counter.js';
import { Patient } from '../model/Patient.js';

const PATIENT_ID_PREFIX = 'PT-';

export const toPatientDTO = (p) => ({
  id: String(p._id),
  patientId: p.patientId,
  name: p.name,
  mobile: p.mobile,
  gender: p.gender,
  dateOfBirth: p.dateOfBirth,
  age: p.age ?? ageFromDob(p.dateOfBirth),
  email: p.email,
  address: p.address,
});

function ageFromDob(dob) {
  if (!dob) return undefined;
  const [y, m, d] = dob.split('-').map(Number);
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age -= 1;
  return age;
}

/** Index-friendly anchored (prefix) clauses matching patient id or lower-cased name. */
export const nameOrIdClauses = (term) => [
  { patientId: { $regex: `^${escapeRegex(term.toUpperCase())}` } },
  { nameLower: { $regex: `^${escapeRegex(term.toLowerCase())}` } },
];

export const mobileClause = (term) => ({ mobile: { $regex: `^${escapeRegex(term)}` } });

/** Atomic $inc counter; retries once when two first-ever callers race on the upsert. */
async function nextPatientId() {
  const inc = () =>
    Counter.findOneAndUpdate({ _id: 'patient' }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  let counter;
  try {
    counter = await inc();
  } catch (err) {
    if (err.code !== 11000) throw err;
    counter = await inc();
  }
  return `${PATIENT_ID_PREFIX}${String(counter.seq).padStart(6, '0')}`;
}

export async function createPatient(input) {
  const patientId = await nextPatientId();
  return Patient.create({ ...input, patientId });
}

/**
 * Reuses a patient only on an exact mobile + (case-insensitive) name match; otherwise creates a new one.
 * @returns {Promise<{patient: object, created: boolean}>}
 */
export async function findOrCreatePatient(input) {
  const existing = await Patient.findOne({ mobile: input.mobile, nameLower: input.name.trim().toLowerCase() }).lean();
  if (existing) return { patient: existing, created: false };
  const patient = await createPatient(input);
  return { patient: patient.toObject(), created: true };
}

/** Resolves either a Mongo _id or a human patientId ('PT-000001'). */
export const findPatientByRef = (ref) =>
  Patient.findOne(mongoose.isValidObjectId(ref) ? { _id: ref } : { patientId: String(ref).toUpperCase() }).lean();

export async function searchPatients({ search, limit }) {
  const term = search?.trim();
  const filter = term ? { $or: [...nameOrIdClauses(term), mobileClause(term)] } : {};
  const patients = await Patient.find(filter).sort(term ? { nameLower: 1 } : { createdAt: -1 }).limit(limit).lean();
  return patients.map(toPatientDTO);
}

export async function getPatient(id, actor) {
  const patient = await Patient.findById(id).lean();
  if (!patient) throw new AppError('Patient not found', 404);

  if (actor.role === ROLES.DOCTOR) {
    const treated = await Appointment.exists({ patient: patient._id, doctor: actor.doctorId });
    if (!treated) throw new AppError('You can only view patients you have an appointment with', 403);
  }
  return toPatientDTO(patient);
}
