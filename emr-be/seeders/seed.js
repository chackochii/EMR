import { pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { Department } from '../modules/department/model/Department.js';
import { Doctor } from '../modules/doctor/model/Doctor.js';
import { updateSchedule } from '../modules/doctor/service/doctorService.js';
import { User } from '../modules/user/model/User.js';
import { createUser } from '../modules/user/service/userService.js';
import { ROLES } from '../utils/constants.js';

const DEPARTMENTS = ['Cardiology', 'Orthopedics', 'Pediatrics', 'General Medicine'];

const DOCTORS = [
  { name: 'Dr. Arjun Mehta', email: 'doctor1@emr.com', department: 'Cardiology', specialization: 'Cardiologist', slotDuration: 15 },
  { name: 'Dr. Priya Nair', email: 'doctor2@emr.com', department: 'Orthopedics', specialization: 'Orthopedic Surgeon', slotDuration: 30 },
  { name: 'Dr. Rahul Sharma', email: 'doctor3@emr.com', department: 'Pediatrics', specialization: 'Pediatrician', slotDuration: 15 },
  { name: 'Dr. Anita Das', email: 'doctor4@emr.com', department: 'General Medicine', specialization: 'General Physician', slotDuration: 30 },
];

/** Mon-Sat, Morning 09:00-12:00 + Evening 13:00-17:00, lunch break 12:00-13:00. */
const buildSchedule = (slotDuration) => ({
  slotDuration,
  workingDays: [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    sessions: [
      { start: '09:00', end: '12:00' },
      { start: '13:00', end: '17:00' },
    ],
  })),
  breaks: [{ start: '12:00', end: '13:00', label: 'Lunch' }],
});

async function ensureSuperAdmin() {
  if (await User.exists({ email: 'admin@emr.com' })) return;
  await User.create({
    name: 'Super Admin',
    email: 'admin@emr.com',
    passwordHash: await bcrypt.hash('Admin@123', env.BCRYPT_SALT_ROUNDS),
    role: ROLES.SUPER_ADMIN,
  });
}

/** Idempotent: existing records are left untouched. */
export async function runSeed() {
  await ensureSuperAdmin();

  const departments = new Map();
  for (const name of DEPARTMENTS) {
    const department =
      (await Department.findOne({ nameLower: name.toLowerCase() })) ?? (await Department.create({ name }));
    departments.set(name, department);
  }

  if (!(await User.exists({ email: 'reception@emr.com' }))) {
    await createUser({ name: 'Front Desk', email: 'reception@emr.com', password: 'Recep@123', role: ROLES.RECEPTIONIST }, null);
  }

  for (const d of DOCTORS) {
    if (!(await User.exists({ email: d.email }))) {
      await createUser(
        {
          name: d.name,
          email: d.email,
          password: 'Doctor@123',
          role: ROLES.DOCTOR,
          departmentId: departments.get(d.department)._id,
          specialization: d.specialization,
        },
        null,
      );
    }
    const user = await User.findOne({ email: d.email }).select('_id').lean();
    const doctor = await Doctor.findOne({ user: user._id }).select('workingDays').lean();
    if (doctor.workingDays.length === 0) await updateSchedule(doctor._id, buildSchedule(d.slotDuration), null);
  }
  logger.info('Seed complete');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await connectDB();
  await runSeed();
  await disconnectDB();
  console.log('Seed complete. Logins: admin@emr.com / Admin@123, reception@emr.com / Recep@123, doctor1..4@emr.com / Doctor@123');
}
