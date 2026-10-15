import { AppError } from '../utils/AppError.js';

/** Allows the request only for the listed roles (must run after tokenValidator). */
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    throw new AppError('You do not have permission to perform this action', 403);
  }
  next();
};
