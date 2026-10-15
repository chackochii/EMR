import { created, ok } from '../../../utils/apiResponse.js';
import { getActor } from '../../../utils/actor.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as appointmentService from '../service/appointmentService.js';

export const create = asyncHandler(async (req, res) => {
  created(res, await appointmentService.createAppointment(req.body, getActor(req)), 'Appointment booked');
});

export const list = asyncHandler(async (req, res) => {
  const { items, meta } = await appointmentService.listAppointments(req.query, getActor(req));
  ok(res, items, 'Appointments fetched', meta);
});

export const update = asyncHandler(async (req, res) => {
  ok(res, await appointmentService.updateAppointment(req.params.id, req.body, getActor(req)), 'Appointment updated');
});

export const cancel = asyncHandler(async (req, res) => {
  ok(res, await appointmentService.cancelAppointment(req.params.id, req.body, getActor(req)), 'Appointment cancelled');
});

export const arrive = asyncHandler(async (req, res) => {
  ok(res, await appointmentService.markArrived(req.params.id, getActor(req)), 'Patient marked as arrived');
});
