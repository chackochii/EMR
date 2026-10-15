import { Router } from 'express';
import * as ctrl from '../modules/department/controller/departmentController.js';
import { createDepartmentBody } from '../modules/department/validator/departmentValidator.js';
import { requireRole } from '../middleware/requireRole.js';
import { tokenValidator } from '../middleware/tokenValidator.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.use(tokenValidator);
router.get('/', ctrl.list);
router.post('/', requireRole(ROLES.SUPER_ADMIN), validate({ body: createDepartmentBody }), ctrl.create);

export default router;
