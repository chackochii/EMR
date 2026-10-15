import { Router } from 'express';
import * as ctrl from '../modules/audit/controller/auditController.js';
import { listAuditLogsQuery } from '../modules/audit/validator/auditValidator.js';
import { requireRole } from '../middleware/requireRole.js';
import { tokenValidator } from '../middleware/tokenValidator.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.get('/', tokenValidator, requireRole(ROLES.SUPER_ADMIN), validate({ query: listAuditLogsQuery }), ctrl.list);

export default router;
