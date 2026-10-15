import { created, ok } from '../../../utils/apiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as departmentService from '../service/departmentService.js';

export const list = asyncHandler(async (req, res) => {
  ok(res, await departmentService.listDepartments(), 'Departments fetched');
});

export const create = asyncHandler(async (req, res) => {
  created(res, await departmentService.createDepartment(req.body), 'Department created');
});
