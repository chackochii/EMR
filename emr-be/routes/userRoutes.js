import { Router } from 'express';
import * as ctrl from '../modules/user/controller/userController.js';
import { createUserBody, listUsersQuery } from '../modules/user/validator/userValidator.js';
import { requireRole } from '../middleware/requireRole.js';
import { tokenValidator } from '../middleware/tokenValidator.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.use(tokenValidator, requireRole(ROLES.SUPER_ADMIN));
router.post('/', validate({ body: createUserBody }), ctrl.create);
router.get('/', validate({ query: listUsersQuery }), ctrl.list);

export default router;
