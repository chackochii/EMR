import { ok } from '../../../utils/apiResponse.js';
import { getActor } from '../../../utils/actor.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { getStats } from '../service/dashboardService.js';

export const stats = asyncHandler(async (req, res) => {
  ok(res, await getStats(getActor(req)), 'Dashboard stats fetched');
});
