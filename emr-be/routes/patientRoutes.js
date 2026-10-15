import { Router } from 'express';
import * as ctrl from '../modules/patient/controller/patientController.js';
import { patientIdParams, patientInput, searchPatientsQuery } from '../modules/patient/validator/patientValidator.js';
import { requireRole } from '../middleware/requireRole.js';
import { tokenValidator } from '../middleware/tokenValidator.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../utils/constants.js';

const router = Router();
const staff = requireRole(ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST);

router.use(tokenValidator);
router.get('/', staff, validate({ query: searchPatientsQuery }), ctrl.search);
router.post('/', staff, validate({ body: patientInput }), ctrl.create);
router.get('/:id', validate({ params: patientIdParams }), ctrl.getById);

export default router;
