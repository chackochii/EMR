import mongoose from 'mongoose';
import { APPOINTMENT_STATUS as STATUS, APPOINTMENT_STATUS_VALUES, ROLES } from '../../../utils/constants.js';
import { minutesOfDay, toHHmm, todayString } from '../../../utils/time.js';
import { Appointment } from '../../appointment/model/Appointment.js';

/**
 * One aggregation ($facet) over the (optionally doctor-scoped) appointments.
 * today    = appointments dated today that are not cancelled
 * upcoming = still-`scheduled` appointments that start from now onwards
 */
export async function getStats(actor) {
  const isDoctor = actor.role === ROLES.DOCTOR;
  const today = todayString();
  const nowTime = toHHmm(minutesOfDay());
  const todayActive = { date: today, status: { $ne: STATUS.CANCELLED } };

  const facets = {
    total: [{ $count: 'n' }],
    today: [{ $match: todayActive }, { $count: 'n' }],
    upcoming: [
      {
        $match: {
          status: STATUS.SCHEDULED,
          $or: [{ date: { $gt: today } }, { date: today, startTime: { $gte: nowTime } }],
        },
      },
      { $count: 'n' },
    ],
    byStatus: [{ $group: { _id: '$status', n: { $sum: 1 } } }],
  };
  if (actor.role === ROLES.SUPER_ADMIN) {
    facets.todayByDoctor = [
      { $match: todayActive },
      { $group: { _id: '$doctor', count: { $sum: 1 } } },
      { $lookup: { from: 'doctors', localField: '_id', foreignField: '_id', as: 'doctor', pipeline: [{ $project: { name: 1 } }] } },
      { $project: { _id: 0, doctorId: { $toString: '$_id' }, name: { $first: '$doctor.name' }, count: 1 } },
      { $sort: { count: -1, name: 1 } },
    ];
  }

  const pipeline = [];
  if (isDoctor) pipeline.push({ $match: { doctor: new mongoose.Types.ObjectId(actor.doctorId) } });
  pipeline.push({ $facet: facets });

  const [result] = await Appointment.aggregate(pipeline);
  const count = (key) => result[key][0]?.n ?? 0;

  const byStatus = Object.fromEntries(APPOINTMENT_STATUS_VALUES.map((s) => [s, 0]));
  for (const { _id, n } of result.byStatus) byStatus[_id] = n;

  const stats = { total: count('total'), today: count('today'), upcoming: count('upcoming'), byStatus };
  if (result.todayByDoctor) stats.todayByDoctor = result.todayByDoctor;
  return stats;
}
