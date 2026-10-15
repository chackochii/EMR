import { ok } from '../../../utils/apiResponse.js';
import { getActor } from '../../../utils/actor.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as slotService from '../service/slotService.js';

export const list = asyncHandler(async (req, res) => {
  ok(res, await slotService.getSlots(req.query, getActor(req)), 'Slots fetched');
});
