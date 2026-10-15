import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env.js';

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const signAccessToken = ({ id, role, doctorId }) =>
  jwt.sign({ role, doctorId }, env.JWT_ACCESS_SECRET, { subject: String(id), expiresIn: env.JWT_ACCESS_EXPIRES_IN });

/** Refresh tokens carry a random jti so two tokens issued in the same second never collide. */
export const signRefreshToken = (id) =>
  jwt.sign({}, env.JWT_REFRESH_SECRET, {
    subject: String(id),
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    jwtid: crypto.randomUUID(),
  });

/** @returns {{id:string, role:string, doctorId?:string}} */
export const verifyAccessToken = (token) => {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  return { id: payload.sub, role: payload.role, doctorId: payload.doctorId };
};

export const verifyRefreshToken = (token) => jwt.verify(token, env.JWT_REFRESH_SECRET);
