import { created, ok } from '../../../utils/apiResponse.js';
import { getActor } from '../../../utils/actor.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as userService from '../service/userService.js';

export const create = asyncHandler(async (req, res) => {
  created(res, await userService.createUser(req.body, getActor(req)), 'User created');
});

export const list = asyncHandler(async (req, res) => {
  const { items, meta } = await userService.listUsers(req.query);
  ok(res, items, 'Users fetched', meta);
});
