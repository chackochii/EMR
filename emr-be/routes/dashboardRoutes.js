import { Router } from 'express';
import * as ctrl from '../modules/dashboard/controller/dashboardController.js';
import { tokenValidator } from '../middleware/tokenValidator.js';

const router = Router();

router.get('/stats', tokenValidator, ctrl.stats);

export default router;
