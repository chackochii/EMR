import { AUDIT_ACTIONS, ROLES } from '../../../utils/constants.js';
import { AppError } from '../../../utils/AppError.js';
import { escapeRegex } from '../../../utils/regex.js';
import { log as audit } from '../../audit/service/auditService.js';
import { Doctor } from '../model/Doctor.js';

const toDTO = (d) => ({
  id: String(d._id),
  name: d.name,
  email: d.user?.email,
  specialization: d.specialization,
  departmentId: String(d.department._id),
  department: { id: String(d.department._id), name: d.department.name },
  slotDuration: d.slotDuration,
  hasSchedule: d.workingDays.some((day) => day.sessions.length > 0),
});

const toScheduleDTO = (d) => ({
  doctorId: String(d._id),
  slotDuration: d.slotDuration,
  workingDays: d.workingDays,
  breaks: d.breaks,
});

/** Doctors may only touch their own doctor entity. */
export function assertCanAccessDoctor(actor, doctorId) {
  if (actor.role === ROLES.DOCTOR && actor.doctorId !== String(doctorId)) {
    throw new AppError('You can only access your own schedule', 403);
  }
}

export async function listDoctors({ departmentId, search }, actor) {
  const filter = { isActive: true };
  if (actor.role === ROLES.DOCTOR) filter._id = actor.doctorId;
  if (departmentId) filter.department = departmentId;
  if (search) filter.nameLower = { $regex: escapeRegex(search.toLowerCase()) };

  const doctors = await Doctor.find(filter)
    .sort({ nameLower: 1 })
    .populate('department', 'name')
    .populate('user', 'email')
    .lean();
  return doctors.map(toDTO);
}

export async function getSchedule(doctorId, actor) {
  assertCanAccessDoctor(actor, doctorId);
  const doctor = await Doctor.findById(doctorId).select('slotDuration workingDays breaks').lean();
  if (!doctor) throw new AppError('Doctor not found', 404);
  return toScheduleDTO(doctor);
}

export async function updateSchedule(doctorId, schedule, actor) {
  const doctor = await Doctor.findByIdAndUpdate(
    doctorId,
    { $set: { slotDuration: schedule.slotDuration, workingDays: schedule.workingDays, breaks: schedule.breaks } },
    { new: true, runValidators: true },
  )
    .select('slotDuration workingDays breaks')
    .lean();
  if (!doctor) throw new AppError('Doctor not found', 404);

  audit({
    action: AUDIT_ACTIONS.SCHEDULE_UPDATED,
    actor,
    entity: 'Doctor',
    entityId: doctorId,
    metadata: { slotDuration: schedule.slotDuration, workingDays: schedule.workingDays.length, breaks: schedule.breaks.length },
  });
  return toScheduleDTO(doctor);
}
