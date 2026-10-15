import { Server } from 'socket.io';
import { corsOptions } from '../config/cors.js';
import { logger } from '../config/logger.js';
import { verifyAccessToken } from '../modules/auth/service/tokenService.js';
import { ALL_APPOINTMENTS_ROOM, ROLES, SOCKET_EVENTS, doctorRoom } from '../utils/constants.js';
import { objectId } from '../utils/validation.js';

let io = null;

/** @returns {import('socket.io').Server | null} null until initSocket ran (e.g. in unit tests). */
export const getIo = () => io;

/** Validates a subscribe/unsubscribe payload and enforces "doctors only see themselves". */
function resolveDoctorRoom(socket, payload) {
  const parsed = objectId.safeParse(payload?.doctorId);
  if (!parsed.success) return { error: 'Invalid doctorId' };
  const { role, doctorId } = socket.data.user;
  if (role === ROLES.DOCTOR && doctorId !== parsed.data) return { error: 'Forbidden' };
  return { room: doctorRoom(parsed.data) };
}

export function initSocket(httpServer) {
  io = new Server(httpServer, { cors: { origin: corsOptions.origin, credentials: true } });

  io.use((socket, next) => {
    try {
      socket.data.user = verifyAccessToken(socket.handshake.auth?.token);
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { role, doctorId } = socket.data.user;
    if (role !== ROLES.DOCTOR) socket.join(ALL_APPOINTMENTS_ROOM);
    else if (doctorId) socket.join(doctorRoom(doctorId));

    for (const [event, action] of [
      [SOCKET_EVENTS.SUBSCRIBE, 'join'],
      [SOCKET_EVENTS.UNSUBSCRIBE, 'leave'],
    ]) {
      socket.on(event, (payload, ack) => {
        const { room, error } = resolveDoctorRoom(socket, payload);
        if (room) socket[action](room);
        if (typeof ack === 'function') ack(room ? { ok: true } : { ok: false, message: error });
      });
    }
  });

  logger.info('Socket.IO initialised');
  return io;
}
