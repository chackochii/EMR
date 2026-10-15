import { SLOT_HOLDING_STATUSES, SLOT_STATUS } from '../../../utils/constants.js';
import { AppError } from '../../../utils/AppError.js';
import { generateSlots } from '../../../utils/slotGenerator.js';
import { Appointment } from '../../appointment/model/Appointment.js';
import { Doctor } from '../../doctor/model/Doctor.js';
import { assertCanAccessDoctor } from '../../doctor/service/doctorService.js';

/** Dynamic slots for a doctor/day: generated from the schedule, merged with live appointments (one query). */
export async function getSlots({ doctorId, date }, actor) {
  assertCanAccessDoctor(actor, doctorId);

  const [doctor, booked] = await Promise.all([
    Doctor.findById(doctorId).select('slotDuration workingDays breaks').lean(),
    Appointment.find({ doctor: doctorId, date, status: { $in: SLOT_HOLDING_STATUSES } })
      .select('startTime')
      .lean(),
  ]);
  if (!doctor) throw new AppError('Doctor not found', 404);

  const bookedByStart = new Map(booked.map((a) => [a.startTime, String(a._id)]));
  const { isWorkingDay, slots } = generateSlots(doctor, date);

  return {
    doctorId: String(doctor._id),
    date,
    slotDuration: doctor.slotDuration,
    isWorkingDay,
    slots: slots.map(({ past, ...slot }) => {
      const appointmentId = bookedByStart.get(slot.startTime);
      if (appointmentId) return { ...slot, status: SLOT_STATUS.BOOKED, appointmentId };
      return { ...slot, status: past ? SLOT_STATUS.PAST : SLOT_STATUS.AVAILABLE };
    }),
  };
}
