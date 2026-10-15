import { Router } from 'express';
import appointmentRoutes from './appointmentRoutes.js';
import auditRoutes from './auditRoutes.js';
import authRoutes from './authRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import departmentRoutes from './departmentRoutes.js';
import doctorRoutes from './doctorRoutes.js';
import patientRoutes from './patientRoutes.js';
import slotRoutes from './slotRoutes.js';
import userRoutes from './userRoutes.js';
import { ok } from '../utils/apiResponse.js';

const router = Router();

router.get('/health', (req, res) => ok(res, { uptime: process.uptime() }, 'OK'));
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/departments', departmentRoutes);
router.use('/doctors', doctorRoutes);
router.use('/slots', slotRoutes);
router.use('/patients', patientRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/audit-logs', auditRoutes);

export default router;
