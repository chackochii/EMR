import { Router } from 'express';
import * as ctrl from '../modules/appointment/controller/appointmentController.js';
import {
  appointmentIdParams,
  cancelAppointmentBody,
  createAppointmentBody,
  listAppointmentsQuery,
  updateAppointmentBody,
} from '../modules/appointment/validator/appointmentValidator.js';
import { requireRole } from '../middleware/requireRole.js';
import { tokenValidator } from '../middleware/tokenValidator.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../utils/constants.js';

const router = Router();
const staff = requireRole(ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST);
const withId = { params: appointmentIdParams };

router.use(tokenValidator);
router.get('/', validate({ query: listAppointmentsQuery }), ctrl.list);
router.post('/', staff, validate({ body: createAppointmentBody }), ctrl.create);
router.put('/:id', validate({ ...withId, body: updateAppointmentBody }), ctrl.update);
router.delete('/:id', staff, validate({ ...withId, body: cancelAppointmentBody }), ctrl.cancel);
router.post('/:id/arrive', staff, validate(withId), ctrl.arrive);

export default router;
