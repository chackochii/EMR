import { logger } from '../../../config/logger.js';
import {
  APPOINTMENT_STATUS as STATUS,
  AUDIT_ACTIONS,
  EDITABLE_STATUSES,
  ROLES,
  SLOT_HOLDING_STATUSES,
  canTransition,
} from '../../../utils/constants.js';
import { AppError } from '../../../utils/AppError.js';
import { buildMeta, skipFor } from '../../../utils/pagination.js';
import { escapeRegex } from '../../../utils/regex.js';
import { generateSlots } from '../../../utils/slotGenerator.js';
import { todayString } from '../../../utils/time.js';
import {
  emitAppointmentCancelled,
  emitAppointmentCreated,
  emitAppointmentUpdated,
} from '../../../sockets/appointmentEvents.js';
import { log as audit } from '../../audit/service/auditService.js';
import { Doctor } from '../../doctor/model/Doctor.js';
import { Patient } from '../../patient/model/Patient.js';
import {
  findOrCreatePatient,
  findPatientByRef,
  mobileClause,
  nameOrIdClauses,
} from '../../patient/service/patientService.js';
import { Appointment } from '../model/Appointment.js';
import { toAppointmentDTO } from './appointmentDto.js';

const POPULATE = [
  { path: 'patient', select: 'patientId name mobile gender' },
  { path: 'doctor', select: 'name specialization' },
  { path: 'department', select: 'name' },
];

const SEARCH_RESOLVE_LIMIT = 500;
const isOwnAppointment = (actor, appointment) => String(appointment.doctor) === actor.doctorId;

// ---------------------------------------------------------------- create

/** The requested time must be an exact, non-past slot generated from the doctor's schedule. */
function resolveBookableSlot(doctor, date, startTime) {
  const { slots } = generateSlots(doctor, date);
  const slot = slots.find((s) => s.startTime === startTime);
  if (!slot) throw new AppError('Selected time is not a valid slot for this doctor on this date', 422);
  if (slot.past) throw new AppError('Cannot book a slot in the past', 422);
  return slot;
}

async function resolvePatient({ patientId, newPatient }) {
  if (newPatient) return findOrCreatePatient(newPatient);
  const patient = await findPatientByRef(patientId);
  if (!patient) throw new AppError('Patient not found', 404);
  return { patient, created: false };
}

/** Compensation for a patient created by a booking that then failed (skipped if someone else already uses it). */
async function discardNewPatient(patient) {
  try {
    if (!(await Appointment.exists({ patient: patient._id }))) await Patient.deleteOne({ _id: patient._id });
  } catch (err) {
    logger.warn({ err, patientId: patient.patientId }, 'Failed to clean up patient after failed booking');
  }
}

export async function createAppointment(input, actor) {
  const { doctorId, date, startTime, purpose, notes } = input;

  const doctor = await Doctor.findById(doctorId).populate('department', 'name').lean();
  if (!doctor || !doctor.isActive) throw new AppError('Doctor not found', 404);
  const slot = resolveBookableSlot(doctor, date, startTime);

  // Cheap early exit so we normally do not create a patient for an already-taken slot.
  const key = { doctor: doctor._id, date, startTime };
  if (await Appointment.exists({ ...key, status: { $in: SLOT_HOLDING_STATUSES } })) {
    throw new AppError('Slot already booked', 409);
  }

  const { patient, created } = await resolvePatient(input);

  let appointment;
  try {
    appointment = await Appointment.create({
      ...key,
      patient: patient._id,
      department: doctor.department._id,
      endTime: slot.endTime,
      purpose,
      notes,
      createdBy: actor.id,
    });
  } catch (err) {
    if (created) await discardNewPatient(patient);
    if (err.code === 11000) throw new AppError('Slot already booked', 409); // lost the race: unique index decided
    throw err;
  }

  const dto = toAppointmentDTO({ ...appointment.toObject(), patient, doctor, department: doctor.department });
  audit({
    action: AUDIT_ACTIONS.APPOINTMENT_CREATED,
    actor,
    entity: 'Appointment',
    entityId: dto.id,
    metadata: { doctorId, date, startTime, patientId: patient.patientId },
  });
  emitAppointmentCreated(dto);
  return dto;
}

// ------------------------------------------------------------------ list

const EMPTY_FILTER = Symbol('empty');

/** Resolves text filters (patient/mobile/doctor name) to indexed id lists, then builds one appointment filter. */
async function buildListFilter(q, actor) {
  const filter = {};

  let doctorIds = null;
  if (actor.role === ROLES.DOCTOR) doctorIds = [actor.doctorId];
  else if (q.doctorId) doctorIds = [q.doctorId];
  if (q.doctor) {
    const matches = await Doctor.find({ nameLower: { $regex: escapeRegex(q.doctor.toLowerCase()) } })
      .select('_id')
      .limit(SEARCH_RESOLVE_LIMIT)
      .lean();
    const matchedIds = matches.map((d) => String(d._id));
    doctorIds = doctorIds ? doctorIds.filter((id) => matchedIds.includes(id)) : matchedIds;
  }
  if (doctorIds) {
    if (doctorIds.length === 0) return EMPTY_FILTER;
    filter.doctor = { $in: doctorIds };
  }

  const patientConditions = [];
  if (q.patient) patientConditions.push({ $or: nameOrIdClauses(q.patient.trim()) });
  if (q.mobile) patientConditions.push(mobileClause(q.mobile.trim()));
  if (patientConditions.length) {
    const patients = await Patient.find({ $and: patientConditions }).select('_id').limit(SEARCH_RESOLVE_LIMIT).lean();
    if (patients.length === 0) return EMPTY_FILTER;
    filter.patient = { $in: patients.map((p) => p._id) };
  }

  if (q.departmentId) filter.department = q.departmentId;
  if (q.status) filter.status = q.status;
  if (q.dateFrom || q.dateTo) {
    filter.date = {};
    if (q.dateFrom) filter.date.$gte = q.dateFrom;
    if (q.dateTo) filter.date.$lte = q.dateTo;
  }
  return filter;
}

export async function listAppointments(q, actor) {
  const filter = await buildListFilter(q, actor);
  if (filter === EMPTY_FILTER) return { items: [], meta: buildMeta(q.page, q.limit, 0) };

  const direction = q.sortOrder === 'asc' ? 1 : -1;
  const sort = { [q.sortBy]: direction };
  if (q.sortBy === 'date') sort.startTime = direction;
  sort._id = direction; // stable pagination

  const [rows, total] = await Promise.all([
    Appointment.find(filter).sort(sort).skip(skipFor(q.page, q.limit)).limit(q.limit).populate(POPULATE).lean(),
    Appointment.countDocuments(filter),
  ]);
  return { items: rows.map(toAppointmentDTO), meta: buildMeta(q.page, q.limit, total) };
}

// ----------------------------------------------------------- transitions

/**
 * Moves an appointment along the status workflow. The pre-read gives clear error messages;
 * the findOneAndUpdate status precondition makes the change atomic under concurrency.
 */
async function transitionStatus(id, to, { set = {}, guard } = {}) {
  const current = await Appointment.findById(id).select('status doctor date').lean();
  if (!current) throw new AppError('Appointment not found', 404);
  if (!canTransition(current.status, to)) {
    throw new AppError(`Cannot change an appointment from '${current.status}' to '${to}'`, 409);
  }
  guard?.(current);

  const updated = await Appointment.findOneAndUpdate(
    { _id: id, status: current.status },
    { $set: { status: to, ...set } },
    { new: true },
  )
    .populate(POPULATE)
    .lean();
  if (!updated) throw new AppError('Appointment was modified by someone else, please retry', 409);
  return toAppointmentDTO(updated);
}

export async function markArrived(id, actor) {
  const dto = await transitionStatus(id, STATUS.ARRIVED, {
    set: { arrivedAt: new Date() },
    guard: (current) => {
      if (current.date !== todayString()) {
        throw new AppError('An appointment can only be marked as arrived on its scheduled date', 409);
      }
    },
  });
  audit({ action: AUDIT_ACTIONS.APPOINTMENT_ARRIVED, actor, entity: 'Appointment', entityId: id });
  emitAppointmentUpdated(dto);
  return dto;
}

export async function cancelAppointment(id, { reason }, actor) {
  const dto = await transitionStatus(id, STATUS.CANCELLED, {
    set: { cancelledAt: new Date(), cancelledBy: actor.id, cancelReason: reason },
  });
  audit({ action: AUDIT_ACTIONS.APPOINTMENT_CANCELLED, actor, entity: 'Appointment', entityId: id, metadata: { reason } });
  emitAppointmentCancelled(dto);
  return dto;
}

// ---------------------------------------------------------------- update

function assertCanEdit(actor, current, body) {
  if (current.status === STATUS.CANCELLED) throw new AppError('Cancelled appointments cannot be modified', 409);

  if (actor.role === ROLES.DOCTOR) {
    if (!isOwnAppointment(actor, current)) throw new AppError('You can only update your own appointments', 403);
    if (body.purpose !== undefined) throw new AppError('Doctors can only update notes and complete appointments', 403);
    return;
  }
  if (body.status !== undefined) throw new AppError('Only the treating doctor can complete an appointment', 403);
  if (!EDITABLE_STATUSES.includes(current.status)) {
    throw new AppError(`A ${current.status} appointment can no longer be edited`, 409);
  }
}

export async function updateAppointment(id, body, actor) {
  const current = await Appointment.findById(id).select('status doctor').lean();
  if (!current) throw new AppError('Appointment not found', 404);
  assertCanEdit(actor, current, body);

  const fields = {};
  if (body.purpose !== undefined) fields.purpose = body.purpose;
  if (body.notes !== undefined) fields.notes = body.notes;

  let dto;
  if (body.status === STATUS.COMPLETED) {
    dto = await transitionStatus(id, STATUS.COMPLETED, { set: { ...fields, completedAt: new Date() } });
  } else {
    const updated = await Appointment.findOneAndUpdate(
      { _id: id, status: current.status },
      { $set: fields },
      { new: true },
    )
      .populate(POPULATE)
      .lean();
    if (!updated) throw new AppError('Appointment was modified by someone else, please retry', 409);
    dto = toAppointmentDTO(updated);
  }

  audit({
    action: body.status ? AUDIT_ACTIONS.APPOINTMENT_COMPLETED : AUDIT_ACTIONS.APPOINTMENT_UPDATED,
    actor,
    entity: 'Appointment',
    entityId: id,
    metadata: { fields: Object.keys(fields), status: body.status },
  });
  emitAppointmentUpdated(dto);
  return dto;
}
