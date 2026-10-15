import { Router } from 'express';
import * as ctrl from '../modules/auth/controller/authController.js';
import { loginBody, refreshBody } from '../modules/auth/validator/authValidator.js';
import { loginLimiter } from '../middleware/rateLimit.js';
import { tokenValidator } from '../middleware/tokenValidator.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.post('/login', loginLimiter, validate({ body: loginBody }), ctrl.login);
router.post('/refresh', validate({ body: refreshBody }), ctrl.refresh);
router.post('/logout', tokenValidator, validate({ body: refreshBody }), ctrl.logout);
router.get('/me', tokenValidator, ctrl.me);

export default router;
