/**
 * Single serializer for appointments (HTTP responses and socket payloads).
 * Expects patient/doctor/department populated (lean objects).
 */
export const toAppointmentDTO = (a) => ({
  id: String(a._id),
  date: a.date,
  startTime: a.startTime,
  endTime: a.endTime,
  status: a.status,
  purpose: a.purpose,
  notes: a.notes ?? '',
  arrivedAt: a.arrivedAt ?? null,
  cancelledAt: a.cancelledAt ?? null,
  cancelReason: a.cancelReason ?? null,
  createdAt: a.createdAt,
  patient: {
    id: String(a.patient._id),
    patientId: a.patient.patientId,
    name: a.patient.name,
    mobile: a.patient.mobile,
    gender: a.patient.gender,
  },
  doctor: { id: String(a.doctor._id), name: a.doctor.name, specialization: a.doctor.specialization },
  department: { id: String(a.department._id), name: a.department.name },
});
