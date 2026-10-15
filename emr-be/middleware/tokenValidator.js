import { verifyAccessToken } from '../modules/auth/service/tokenService.js';
import { AppError } from '../utils/AppError.js';

/** Verifies the Bearer access token and attaches `req.user = {id, role, doctorId?}`. */
export const tokenValidator = (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new AppError('Authentication required', 401);
  req.user = verifyAccessToken(token);
  next();
};
