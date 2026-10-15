import { Router } from 'express';
import * as ctrl from '../modules/doctor/controller/doctorController.js';
import { doctorIdParams, listDoctorsQuery, scheduleBody } from '../modules/doctor/validator/doctorValidator.js';
import { requireRole } from '../middleware/requireRole.js';
import { tokenValidator } from '../middleware/tokenValidator.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.use(tokenValidator);
router.get('/', validate({ query: listDoctorsQuery }), ctrl.list);
router.get('/:id/schedule', validate({ params: doctorIdParams }), ctrl.getSchedule);
router.put(
  '/:id/schedule',
  requireRole(ROLES.SUPER_ADMIN),
  validate({ params: doctorIdParams, body: scheduleBody }),
  ctrl.updateSchedule,
);

export default router;
