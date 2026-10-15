import { ALL_APPOINTMENTS_ROOM, SOCKET_EVENTS, doctorRoom } from '../utils/constants.js';
import { getIo } from './socket.js';

/** Emits to the doctor's room and the staff-wide room (a socket in both receives it once). */
function emitToDoctor(event, appointment) {
  getIo()?.to([doctorRoom(appointment.doctor.id), ALL_APPOINTMENTS_ROOM]).emit(event, { appointment });
}

export const emitAppointmentCreated = (dto) => emitToDoctor(SOCKET_EVENTS.APPOINTMENT_CREATED, dto);
export const emitAppointmentUpdated = (dto) => emitToDoctor(SOCKET_EVENTS.APPOINTMENT_UPDATED, dto);
export const emitAppointmentCancelled = (dto) => emitToDoctor(SOCKET_EVENTS.APPOINTMENT_CANCELLED, dto);
