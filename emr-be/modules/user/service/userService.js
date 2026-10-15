import bcrypt from 'bcryptjs';
import { env } from '../../../config/env.js';
import { AUDIT_ACTIONS, ROLES } from '../../../utils/constants.js';
import { AppError } from '../../../utils/AppError.js';
import { buildMeta, skipFor } from '../../../utils/pagination.js';
import { log as audit } from '../../audit/service/auditService.js';
import { Department } from '../../department/model/Department.js';
import { Doctor } from '../../doctor/model/Doctor.js';
import { User } from '../model/User.js';
import { toUserDTO } from './userDto.js';

/**
 * Creates a user; for doctors also creates the Doctor profile (empty schedule).
 * Without multi-document transactions the user is removed again if the profile insert fails.
 */
export async function createUser(input, actor) {
  const { name, email, password, role, mobile, departmentId, specialization } = input;

  if (role === ROLES.DOCTOR && !(await Department.exists({ _id: departmentId }))) {
    throw new AppError('Department not found', 404);
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
  let user;
  try {
    user = await User.create({ name, email, passwordHash, role, mobile });
  } catch (err) {
    if (err.code === 11000) throw new AppError('A user with this email already exists', 409);
    throw err;
  }

  let doctorId;
  if (role === ROLES.DOCTOR) {
    try {
      const doctor = await Doctor.create({
        user: user._id,
        department: departmentId,
        name,
        nameLower: name.toLowerCase(),
        specialization,
      });
      doctorId = doctor._id;
    } catch (err) {
      await User.deleteOne({ _id: user._id });
      throw err;
    }
  }

  audit({ action: AUDIT_ACTIONS.USER_CREATED, actor, entity: 'User', entityId: user._id, metadata: { role, email } });
  return toUserDTO(user, doctorId);
}

export async function listUsers({ role, page, limit }) {
  const filter = role ? { role } : {};
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skipFor(page, limit)).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  const doctors = await Doctor.find({ user: { $in: users.map((u) => u._id) } }).select('user').lean();
  const doctorByUser = new Map(doctors.map((d) => [String(d.user), d._id]));

  return {
    items: users.map((u) => toUserDTO(u, doctorByUser.get(String(u._id)))),
    meta: buildMeta(page, limit, total),
  };
}
