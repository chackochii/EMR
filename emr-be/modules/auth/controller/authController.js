import { ok } from '../../../utils/apiResponse.js';
import { getActor } from '../../../utils/actor.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as authService from '../service/authService.js';

export const login = asyncHandler(async (req, res) => {
  ok(res, await authService.login(req.body, { ip: req.ip }), 'Login successful');
});

export const refresh = asyncHandler(async (req, res) => {
  ok(res, await authService.refresh(req.body), 'Token refreshed');
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.body, getActor(req));
  ok(res, null, 'Logged out');
});

export const me = asyncHandler(async (req, res) => {
  ok(res, await authService.getMe(getActor(req)), 'Current user');
});
