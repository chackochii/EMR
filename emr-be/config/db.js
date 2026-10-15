import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';
// Register every model so their indexes are built on startup.
import '../modules/appointment/model/Appointment.js';
import '../modules/audit/model/AuditLog.js';
import '../modules/auth/model/RefreshToken.js';
import '../modules/department/model/Department.js';
import '../modules/doctor/model/Doctor.js';
import '../modules/patient/model/Counter.js';
import '../modules/patient/model/Patient.js';
import '../modules/user/model/User.js';

mongoose.set('strictQuery', true);

/** Connects and waits for every model's indexes (the unique slot index is critical for correctness). */
export async function connectDB(uri = env.MONGODB_URI) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  logger.info('MongoDB connected');
}

export const disconnectDB = () => mongoose.disconnect();
