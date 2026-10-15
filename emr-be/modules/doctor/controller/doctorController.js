import { ok } from '../../../utils/apiResponse.js';
import { getActor } from '../../../utils/actor.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as doctorService from '../service/doctorService.js';

export const list = asyncHandler(async (req, res) => {
  ok(res, await doctorService.listDoctors(req.query, getActor(req)), 'Doctors fetched');
});

export const getSchedule = asyncHandler(async (req, res) => {
  ok(res, await doctorService.getSchedule(req.params.id, getActor(req)), 'Schedule fetched');
});

export const updateSchedule = asyncHandler(async (req, res) => {
  ok(res, await doctorService.updateSchedule(req.params.id, req.body, getActor(req)), 'Schedule updated');
});
