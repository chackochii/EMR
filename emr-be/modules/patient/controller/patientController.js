import { created, ok } from '../../../utils/apiResponse.js';
import { getActor } from '../../../utils/actor.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as patientService from '../service/patientService.js';

export const search = asyncHandler(async (req, res) => {
  ok(res, await patientService.searchPatients(req.query), 'Patients fetched');
});

export const create = asyncHandler(async (req, res) => {
  const patient = await patientService.createPatient(req.body);
  created(res, patientService.toPatientDTO(patient), 'Patient created');
});

export const getById = asyncHandler(async (req, res) => {
  ok(res, await patientService.getPatient(req.params.id, getActor(req)), 'Patient fetched');
});
