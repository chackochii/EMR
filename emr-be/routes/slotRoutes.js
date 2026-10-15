import { Router } from 'express';
import * as ctrl from '../modules/slot/controller/slotController.js';
import { slotsQuery } from '../modules/slot/validator/slotValidator.js';
import { tokenValidator } from '../middleware/tokenValidator.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/', tokenValidator, validate({ query: slotsQuery }), ctrl.list);

export default router;
