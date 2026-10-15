import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env.js';
import { AUDIT_ACTIONS } from '../../../utils/constants.js';
import { AppError } from '../../../utils/AppError.js';
import { log as audit } from '../../audit/service/auditService.js';
import { Doctor } from '../../doctor/model/Doctor.js';
import { User } from '../../user/model/User.js';
import { toUserDTO } from '../../user/service/userDto.js';
import { RefreshToken } from '../model/RefreshToken.js';
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from './tokenService.js';

// Compared against when the email is unknown so response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', env.BCRYPT_SALT_ROUNDS);

const findDoctorId = async (userId) => (await Doctor.findOne({ user: userId }).select('_id').lean())?._id;

async function issueTokens(user, doctorId) {
  const accessToken = signAccessToken({ id: user._id, role: user.role, doctorId });
  const refreshToken = signRefreshToken(user._id);
  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(jwt.decode(refreshToken).exp * 1000),
  });
  return { accessToken, refreshToken };
}

const revokeAllForUser = (userId) =>
  RefreshToken.updateMany({ user: userId, revokedAt: null }, { $set: { revokedAt: new Date() } });

export async function login({ email, password }, ctx) {
  const user = await User.findOne({ email }).select('+passwordHash');
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid || !user.isActive) {
    audit({ action: AUDIT_ACTIONS.LOGIN_FAILED, actor: { ip: ctx.ip }, entity: 'User', metadata: { email } });
    throw new AppError('Invalid email or password', 401);
  }

  const doctorId = await findDoctorId(user._id);
  const tokens = await issueTokens(user, doctorId);
  audit({ action: AUDIT_ACTIONS.LOGIN, actor: { id: user._id, role: user.role, ip: ctx.ip }, entity: 'User', entityId: user._id });
  return { user: toUserDTO(user, doctorId), ...tokens };
}

/** Rotates the refresh token. Presenting an already-revoked token revokes every session of that user. */
export async function refresh({ refreshToken }) {
  const payload = verifyRefreshToken(refreshToken);
  const tokenHash = hashToken(refreshToken);

  const consumed = await RefreshToken.findOneAndUpdate(
    { tokenHash, revokedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { revokedAt: new Date() } },
  ).lean();

  if (!consumed) {
    const known = await RefreshToken.exists({ tokenHash });
    if (known) await revokeAllForUser(payload.sub); // reuse of a rotated/revoked token
    throw new AppError('Invalid refresh token', 401);
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw new AppError('Invalid refresh token', 401);
  return issueTokens(user, await findDoctorId(user._id));
}

export async function logout({ refreshToken }, actor) {
  await RefreshToken.updateOne(
    { tokenHash: hashToken(refreshToken), user: actor.id, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
  audit({ action: AUDIT_ACTIONS.LOGOUT, actor, entity: 'User', entityId: actor.id });
}

export async function getMe(actor) {
  const user = await User.findById(actor.id);
  if (!user || !user.isActive) throw new AppError('User not found', 404);
  return { user: toUserDTO(user, actor.doctorId) };
}
